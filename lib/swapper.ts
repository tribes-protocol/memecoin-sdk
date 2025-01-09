import { SWAP_ABI } from '@/abi'
import { MemecoinAPI } from '@/api'
import {
  MULTISIG_FEE_COLLECTOR,
  TOKEN_SWAPPER_ADDRESS,
  UNISWAP_FEE_TIERS,
  WETH_ADDRESS
} from '@/constants'
import { calculateMinAmountWithSlippage, compactMap, isBigInt, isNull } from '@/functions'
import {
  EstimateSwapParams,
  EthAddress,
  GetPoolPairsResponse,
  HexString,
  HydratedCoin,
  MemecoinSDKConfig,
  ResolveTokenPoolResponse,
  SwapEstimation,
  SwapParams,
  TokenPoolType
} from '@/types'
import { UniswapV2 } from '@/uniswapv2'
import { UniswapV3 } from '@/uniswapv3'
import { getWalletClient } from '@/walletclient'
import { LRUCache } from 'lru-cache'
import { Abi, encodeFunctionData, formatEther, PublicClient, WalletClient } from 'viem'
import { base } from 'viem/chains'
import { eip5792Actions, writeContracts } from 'viem/experimental'

export class TokenSwapper {
  private poolCache = new LRUCache<string, Promise<GetPoolPairsResponse>>({
    max: 10000,
    ttl: 1000 * 60 // 1 min
  })

  constructor(
    private readonly publicClient: PublicClient,
    private readonly config: MemecoinSDKConfig,
    private readonly uniswapV3: UniswapV3,
    private readonly uniswapV2: UniswapV2,
    private readonly api: MemecoinAPI
  ) {}

  private get walletClient(): WalletClient {
    return getWalletClient(this.config)
  }

  private async getPoolPairs(
    tokenIn: EthAddress,
    tokenOut: EthAddress
  ): Promise<GetPoolPairsResponse> {
    const cacheKey = `${tokenIn}-${tokenOut}`
    const cachedPool = this.poolCache.get(cacheKey)
    if (cachedPool) {
      return cachedPool
    }

    const promise = (async () => {
      const [coinIn, coinOut] = await Promise.all([
        this.api.getCoin(tokenIn),
        this.api.getCoin(tokenOut)
      ])

      if (tokenIn === WETH_ADDRESS) {
        const coinOutPool = coinOut
          ? this.resolvePoolOfMemecoin(coinOut)
          : await this.resolveTokenWETHPool(tokenOut)

        if (coinOut?.dexKind === 'memecoinv5' && coinOut.dexInitiated) {
          return {
            pools: [
              { tokenIn: { poolType: TokenPoolType.MEME, poolFee: 0 }, tokenOut: coinOutPool }
            ]
          }
        }

        return {
          pools: [{ tokenIn: { poolType: TokenPoolType.WETH, poolFee: 0 }, tokenOut: coinOutPool }]
        }
      }

      const coinInPool = coinIn
        ? this.resolvePoolOfMemecoin(coinIn)
        : await this.resolveTokenWETHPool(tokenIn)

      const coinOutPool =
        tokenOut === WETH_ADDRESS
          ? { poolType: TokenPoolType.WETH, poolFee: 0 }
          : coinOut
            ? this.resolvePoolOfMemecoin(coinOut)
            : await this.resolveTokenWETHPool(tokenOut)

      return {
        pools: [{ tokenIn: coinInPool, tokenOut: coinOutPool }]
      }
    })()

    this.poolCache.set(cacheKey, promise)

    return promise
  }

  async estimateSwap(params: EstimateSwapParams): Promise<SwapEstimation> {
    const { tokenIn, tokenOut, amountIn, account, recipient, orderReferrer, slippage } = params

    if (params.skipCache) {
      this.poolCache.delete(tokenIn)
      this.poolCache.delete(tokenOut)
    }

    const [poolPairs, allowance] = await Promise.all([
      this.getPoolPairs(tokenIn, tokenOut),
      this.api.getERC20Allowance(tokenIn, TOKEN_SWAPPER_ADDRESS, account)
    ])

    const estimates = await Promise.all(
      poolPairs.pools.map(async (pool) => {
        try {
          const args = {
            tokenIn,
            tokenOut,
            tokenInPoolType: pool.tokenIn.poolType,
            tokenOutPoolType: pool.tokenOut.poolType,
            recipient: recipient ?? account,
            amountIn,
            amountOutMinimum: 0n,
            orderReferrer: orderReferrer ?? MULTISIG_FEE_COLLECTOR,
            feeIn: pool.tokenIn.poolFee,
            feeOut: pool.tokenOut.poolFee
          }

          const { result } = await this.publicClient.simulateContract({
            account,
            address: TOKEN_SWAPPER_ADDRESS,
            abi: SWAP_ABI,
            functionName: 'estimateSwap',
            args: [args]
          })

          console.log('result', formatEther(result), pool.tokenIn.poolType)

          if (!isBigInt(result)) {
            throw new Error('Invalid response format')
          }

          return {
            amountOut: result,
            swapParams: {
              ...params,
              allowance,
              feeIn: pool.tokenIn.poolFee,
              feeOut: pool.tokenOut.poolFee,
              tokenInPoolType: pool.tokenIn.poolType,
              tokenOutPoolType: pool.tokenOut.poolType,
              amountOutMinimum: calculateMinAmountWithSlippage(result, slippage)
            }
          }
        } catch (e) {
          console.log(`pool.tokenIn.poolType: ${pool.tokenIn.poolType}`, e)
          return null
        }
      })
    )

    const validEstimates = compactMap(estimates)

    if (validEstimates.length === 0) {
      throw new Error('No valid estimates found')
    }

    const bestEstimate = validEstimates.reduce((best, current) =>
      current.amountOut > best.amountOut ? current : best
    )

    return bestEstimate
  }

  async swap(params: SwapParams, isBatchSupported: boolean): Promise<HexString> {
    const walletClient = this.walletClient

    const {
      allowance,
      amountOutMinimum,
      tokenIn,
      amountIn,
      orderReferrer,
      recipient,
      feeIn,
      feeOut,
      tokenInPoolType,
      tokenOutPoolType,
      tokenOut
    } = params

    const amountOutMin = calculateMinAmountWithSlippage(amountOutMinimum)

    const approveContractCall = {
      address: tokenIn,
      abi: [
        {
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function'
        }
      ],
      functionName: 'approve',
      args: [TOKEN_SWAPPER_ADDRESS, amountIn]
    } as const

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const args = {
      tokenIn,
      tokenOut,
      tokenInPoolType,
      tokenOutPoolType,
      recipient: recipient ?? account.address,
      amountIn,
      amountOutMinimum: amountOutMin,
      orderReferrer: orderReferrer ?? MULTISIG_FEE_COLLECTOR,
      feeIn: feeIn ?? 0,
      feeOut: feeOut ?? 0
    }

    const swapContractCall = {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      abi: SWAP_ABI as Abi,
      address: TOKEN_SWAPPER_ADDRESS,
      functionName: 'swap',
      args: [args],
      value: tokenIn === WETH_ADDRESS ? amountIn : 0n
    } as const

    if (isBatchSupported) {
      const result = await writeContracts(walletClient, {
        contracts: [
          // approve
          ...(tokenIn !== WETH_ADDRESS && allowance < amountIn ? [approveContractCall] : []),
          // swap
          swapContractCall
        ],
        account,
        chain: base
      })

      let status, receipts
      const extendedWalletClient = walletClient.extend(eip5792Actions())
      do {
        ;({ status, receipts } = await extendedWalletClient.getCallsStatus({
          id: result
        }))
        if (status !== 'CONFIRMED') {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } while (status !== 'CONFIRMED')

      if (isNull(receipts) || receipts.length === 0) {
        throw new Error('Transaction failed')
      }

      const lastReceipt = receipts[receipts.length - 1]
      if (isNull(lastReceipt)) {
        throw new Error('Transaction failed')
      }

      if (isNull(lastReceipt.transactionHash)) {
        throw new Error('Transaction reverted')
      }

      return lastReceipt.transactionHash
    } else {
      if (tokenIn !== WETH_ADDRESS && allowance < amountIn) {
        const data = encodeFunctionData(approveContractCall)
        const txParams = {
          to: tokenIn,
          data,
          account,
          chain: base
        }

        const gas = ((await this.publicClient.estimateGas(txParams)) * 125n) / 100n

        const approveTx = await walletClient.sendTransaction({
          ...txParams,
          gas
        })

        await this.publicClient.waitForTransactionReceipt({
          hash: approveTx,
          confirmations: 2
        })
      }

      const data = encodeFunctionData(swapContractCall)

      const txParams = {
        to: TOKEN_SWAPPER_ADDRESS,
        data,
        account,
        chain: base,
        value: tokenIn === WETH_ADDRESS ? amountIn : 0n
      }

      const gas = ((await this.publicClient.estimateGas(txParams)) * 125n) / 100n

      const tx = await walletClient.sendTransaction({
        ...txParams,
        gas
      })

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: tx,
        confirmations: 3
      })

      return receipt.transactionHash
    }
  }

  private resolvePoolOfMemecoin(memecoin: HydratedCoin): ResolveTokenPoolResponse {
    if (!memecoin.dexInitiated) {
      return {
        poolType:
          memecoin.dexKind === 'memecoinv5'
            ? TokenPoolType.BondingCurveV2
            : TokenPoolType.BondingCurveV1,
        poolFee: 0
      }
    }

    switch (memecoin.dexKind) {
      case 'univ2':
        return { poolType: TokenPoolType.UniswapV2, poolFee: 0 }
      case 'univ3':
      case 'univ3-bonding':
      case 'memecoinv5':
        return { poolType: TokenPoolType.UniswapV3, poolFee: 10000 }
    }
  }

  private async resolveTokenWETHPool(token: EthAddress): Promise<ResolveTokenPoolResponse> {
    const v3PoolPromises = UNISWAP_FEE_TIERS.map((fee) =>
      this.uniswapV3.getWETHPoolLiquidity(token, fee)
    )

    const v2Promise = this.uniswapV2.getWETHPoolLiquidity(token)

    const poolResults = await Promise.all([...v3PoolPromises, v2Promise])

    const deepestPool = poolResults.reduce((max, pool) =>
      pool.liquidity > max.liquidity ? pool : max
    )

    if (deepestPool.liquidity === 0n) {
      throw new Error('No pool found')
    }

    return {
      poolType: deepestPool.poolType,
      poolFee: deepestPool.poolFee
    }
  }
}

import {
  SWAP_EXACT_ETH_FOR_TOKENS_ABI,
  SWAP_EXACT_TOKENS_FOR_ETH_ABI,
  SWAP_MEMECOIN_ABI,
  UNISWAP_V3_SWAP_ABI,
  UNISWAPV3_GENERATE_SALT_ABI,
  UNISWAPV3_LAUNCH_ABI
} from '@/abi'
import {
  API_BASE_URL,
  CURRENT_MEME_INFO,
  getBuyTokensABI,
  getCreateMemeABI,
  getSellTokensABI,
  INITIAL_RESERVE,
  INITIAL_SUPPLY,
  LN_1_0001,
  MEME_V3,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_PROXY,
  UNISWAP_V3_LAUNCHER,
  UNISWAP_V3_ROUTER,
  WETH_TOKEN
} from '@/constants'
import {
  encodeOnchainData,
  isBatchSupported,
  isNull,
  isRequiredNumber,
  isValidBigIntString,
  retry
} from '@/functions'
import {
  BuyFrontendParams,
  EstimateSwapCoinParams,
  EstimateSwapParams,
  EstimateTradeParams,
  EthAddress,
  EthAddressSchema,
  GenerateSaltParams,
  GenerateSaltResultSchema,
  HexString,
  HydratedCoin,
  HydratedCoinSchema,
  isBuyFrontendParams,
  isEthAddressOrEth,
  isSellFrontendParams,
  isSwapFrontendParams,
  LaunchCoinDirectParams,
  LaunchCoinParams,
  LaunchCoinResponse,
  LaunchResultSchema,
  MarketCapToTickParams,
  MemecoinSDKConfig,
  SellFrontendParams,
  SwapFrontendParams,
  TradeBuyParams,
  TradeSellParams,
  TradeSwapParams
} from '@/types'
import { fetchEthereumPrice, getUniswapPair, getUniswapV3TickSpacing } from '@/uniswap'
import { ChainId, Token, WETH9 } from '@uniswap/sdk-core'
import BigNumber from 'bignumber.js'
import {
  Abi,
  Chain,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  Log,
  PublicClient,
  WalletCapabilities,
  WalletCapabilitiesRecord,
  WalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { eip5792Actions, getCapabilities, writeContracts } from 'viem/experimental'

const FEE_COLLECTOR = CURRENT_MEME_INFO.FEE_COLLECTOR

export class MemecoinSDK {
  private readonly config: MemecoinSDKConfig
  private readonly rpcUrl: string
  private readonly apiBaseUrl: string
  private teamFee: Promise<bigint> = Promise.resolve(200000000000000n)
  private teamFeeInterval: NodeJS.Timeout

  private get walletClient(): WalletClient {
    if ('walletClient' in this.config && this.config.walletClient) {
      return this.config.walletClient
    } else if ('privateKey' in this.config && this.config.privateKey) {
      return createWalletClient({
        account: privateKeyToAccount(this.config.privateKey),
        chain: base,
        transport: http(this.rpcUrl)
      })
    } else {
      throw new Error('Wallet client is required for write operations')
    }
  }

  private get capabilities(): Promise<WalletCapabilitiesRecord<WalletCapabilities, number>> {
    return new Promise<WalletCapabilitiesRecord<WalletCapabilities, number>>((resolve, reject) => {
      if ('walletClient' in this.config && this.config.walletClient) {
        resolve(getCapabilities(this.config.walletClient))
      } else {
        reject(new Error('Wallet client is required for write operations'))
      }
    })
  }

  public readonly publicClient: PublicClient
  public readonly baseChain: Chain

  constructor(config: MemecoinSDKConfig) {
    this.config = config
    this.rpcUrl = config.rpcUrl
    this.apiBaseUrl = config.apiBaseUrl ?? API_BASE_URL
    this.baseChain = {
      ...base,
      rpcUrls: {
        default: {
          http: [this.rpcUrl]
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.publicClient = createPublicClient({
      chain: this.baseChain,
      transport: http(this.rpcUrl)
    }) as PublicClient

    void this.refreshTeamFee()
    this.teamFeeInterval = setInterval(() => this.refreshTeamFee(), 15 * 60 * 1000)
  }

  destroy(): void {
    clearInterval(this.teamFeeInterval)
  }

  private async switchToBaseChain(): Promise<void> {
    const walletClient = this.walletClient
    const currentChain = await walletClient.getChainId()

    if (currentChain === this.baseChain.id) {
      console.log('Already on base chain')
      return
    }

    try {
      console.log('attempting to switch to base chain')
      await walletClient.switchChain({ id: this.baseChain.id })
    } catch (error: unknown) {
      console.warn('Error switching to base chain', error)
      try {
        await walletClient.addChain({ chain: this.baseChain })
      } catch (error: unknown) {
        console.warn('Error adding base chain', error)
      }
    }
  }

  private async refreshTeamFee(): Promise<void> {
    try {
      const fee = await this.fetchTeamFee()
      this.teamFee = Promise.resolve(fee)
    } catch (e) {
      console.warn('Error fetching team fee', e)
    }
  }

  private async fetchTeamFee(): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-team-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memeDeployer: CURRENT_MEME_INFO.DEPLOYER })
    })
    const data = await response.json()

    if (!isValidBigIntString(data)) {
      throw new Error('Invalid response format')
    }

    return BigInt(data)
  }

  async getCoin(id: EthAddress | number): Promise<HydratedCoin> {
    if (isRequiredNumber(id)) {
      const response = await fetch(`${this.apiBaseUrl}/api/coins/get-by-id`, {
        method: 'POST',
        body: JSON.stringify({ coinId: id }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = HydratedCoinSchema.parse(await response.json())
      return data
    }

    const response = await fetch(`${this.apiBaseUrl}/api/coins/${id}`)
    const data = HydratedCoinSchema.parse(await response.json())
    return data
  }

  async getTrending(): Promise<HydratedCoin[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/trending-coins`)
    const data = HydratedCoinSchema.array().parse(await response.json())
    return data
  }

  async estimateBuy(params: EstimateTradeParams): Promise<bigint> {
    const { coin, amountIn } = params

    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-amount-out-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memeTokenAddress: coin,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async buy(params: TradeBuyParams): Promise<HexString> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    if (isBuyFrontendParams(params)) {
      if (params.coin.dexInitiated) {
        return this.buyFromUniswap(params)
      } else {
        return this.buyFromMemecoin(params)
      }
    } else {
      const [coin, amountOut] = await Promise.all([
        this.getCoin(params.coin),
        this.estimateBuy({
          coin: params.coin,
          amountIn: params.amountIn,
          using: params.using
        })
      ])
      if (coin.dexInitiated) {
        return this.buyFromUniswap({
          ...params,
          coin,
          amountOut,
          pair:
            coin.dexKind === 'uniV2'
              ? await getUniswapPair(coin.contractAddress, this.publicClient)
              : undefined
        })
      } else {
        return this.buyFromMemecoin({ ...params, coin, amountOut })
      }
    }
  }

  private async isBatchSupported(): Promise<boolean> {
    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
    }

    return batchSupported
  }

  private async buyFromUniswap(params: BuyFrontendParams): Promise<HexString> {
    const { coin, amountIn: ethAmount, slippage, pair, amountOut } = params

    const walletClient = this.walletClient
    const token = new Token(ChainId.BASE, coin.contractAddress, 18)
    const weth = WETH9[ChainId.BASE]
    if (isNull(weth)) {
      throw new Error('WETH9 is not supported on this chain')
    }

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    if (isNull(pair) && coin.dexKind === 'uniV2') {
      throw new Error('Pair is required for uniswap trade')
    }

    const amountOutMin = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const fee = (ethAmount * 17n) / 1000n // 1.7% fee

    const uniswapV2SwapContractCall = {
      abi: SWAP_EXACT_ETH_FOR_TOKENS_ABI,
      functionName: 'swapExactETHForTokens',
      args: [token.address, amountOutMin, deadline, fee]
    }

    const uniswapV3SwapContractCall = {
      abi: UNISWAP_V3_SWAP_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: WETH_TOKEN,
          tokenOut: token.address,
          fee: 10000,
          recipient: account.address,
          amountIn: ethAmount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0n
        }
      ]
    }

    const contractParams =
      coin.dexKind === 'uniV2'
        ? uniswapV2SwapContractCall
        : coin.dexKind === 'uniV3'
          ? uniswapV3SwapContractCall
          : undefined

    if (isNull(contractParams)) {
      throw new Error('Invalid dex kind')
    }

    const spender = this.getUniswapContract(coin)

    const data = encodeFunctionData(contractParams)

    const txParams = {
      to: spender,
      data,
      value: ethAmount,
      account,
      chain: base
    }

    const tx = (await this.isBatchSupported())
      ? await walletClient.sendTransaction(txParams)
      : await walletClient.sendTransaction({
          ...txParams,
          gas: ((await this.publicClient.estimateGas(txParams)) * 125n) / 100n
        })

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: tx,
      confirmations: 3
    })

    return receipt.transactionHash
  }

  private async buyFromMemecoin(params: BuyFrontendParams): Promise<HexString> {
    const walletClient = this.walletClient

    const { coin, amountIn, amountOut, affiliate, slippage, lockingDays } = params

    const minTokens = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    if (isNull(coin.memePool)) {
      throw new Error('Meme pool is required for memecoin trade')
    }

    const abi = getBuyTokensABI(coin.memePool)

    const args = [
      coin.contractAddress,
      minTokens,
      affiliate ?? CURRENT_MEME_INFO.FEE_COLLECTOR,
      BigInt(lockingDays ?? 0)
    ]

    const data = encodeFunctionData({
      abi,
      functionName: 'buyTokens',
      args
    })

    const txParams = {
      to: coin.memePool,
      data,
      value: amountIn,
      account,
      chain: base
    }

    const tx = (await this.isBatchSupported())
      ? await walletClient.sendTransaction(txParams)
      : await walletClient.sendTransaction({
          ...txParams,
          gas: ((await this.publicClient.estimateGas(txParams)) * 125n) / 100n
        })

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: tx,
      confirmations: 3
    })

    return receipt.transactionHash
  }

  async estimateSell(params: EstimateTradeParams): Promise<bigint> {
    const { coin, amountIn } = params

    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-amount-out-eth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memeTokenAddress: coin,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  private async estimateSwapCoin(params: EstimateSwapCoinParams): Promise<bigint> {
    const { fromToken, toToken, amountIn } = params

    const response = await fetch(`${this.apiBaseUrl}/api/trades/estimate-swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromToken,
        toToken,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async estimateSwap(params: EstimateSwapParams): Promise<bigint> {
    const { fromToken, toToken, amountIn } = params

    if (fromToken === 'eth') {
      return this.estimateBuy({ coin: toToken, amountIn, using: 'eth' })
    } else if (toToken === 'eth') {
      return this.estimateSell({ coin: fromToken, amountIn, using: 'eth' })
    } else {
      return this.estimateSwapCoin({ fromToken, toToken, amountIn })
    }
  }

  async sell(params: TradeSellParams): Promise<HexString> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    if (isSellFrontendParams(params)) {
      if (params.coin.dexInitiated) {
        return this.sellFromUniswap(params)
      } else {
        return this.sellFromMemecoin(params)
      }
    } else {
      const [coin, amountOut] = await Promise.all([
        this.getCoin(params.coin),
        this.estimateSell({
          coin: params.coin,
          amountIn: params.amountIn,
          using: params.using
        })
      ])

      const walletClient = this.walletClient
      const address = walletClient.account?.address
      if (isNull(address)) {
        throw new Error('No account found')
      }

      if (coin.dexInitiated) {
        const spender = this.getUniswapContract(coin)

        const allowance = await this.getERC20Allowance(coin.contractAddress, spender, address)

        return this.sellFromUniswap({
          ...params,
          coin,
          amountOut,
          pair:
            coin.dexKind === 'uniV2'
              ? await getUniswapPair(coin.contractAddress, this.publicClient)
              : undefined,
          allowance
        })
      } else {
        if (isNull(coin.memePool)) {
          throw new Error('Meme pool is required for memecoin trade')
        }

        const allowance = await this.getERC20Allowance(coin.contractAddress, coin.memePool, address)

        return this.sellFromMemecoin({ ...params, coin, amountOut, allowance })
      }
    }
  }

  private async sellFromUniswap(params: SellFrontendParams): Promise<HexString> {
    const { coin, amountIn: tokenAmount, amountOut, slippage, pair, allowance } = params

    const walletClient = this.walletClient

    const token = new Token(ChainId.BASE, coin.contractAddress, 18)
    const weth = WETH9[ChainId.BASE]
    if (isNull(weth)) {
      throw new Error('WETH9 is not supported on this chain')
    }

    if (isNull(pair) && coin.dexKind === 'uniV2') {
      throw new Error('Pair is required for uniswap trade')
    }

    const amountOutMin = this.calculateMinAmountWithSlippage(amountOut, slippage)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    const spender = this.getUniswapContract(coin)

    const approveContractCall = {
      address: coin.contractAddress,
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
      args: [spender, tokenAmount]
    } as const

    const fee = (amountOut * 17n) / 1000n // 1.7% fee

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const uniswapV2SwapContractCall = {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      abi: SWAP_EXACT_TOKENS_FOR_ETH_ABI as Abi,
      address: UNISWAP_V2_ROUTER_PROXY,
      functionName: 'swapExactTokensForETH',
      args: [
        EthAddressSchema.parse(token.address),
        tokenAmount,
        BigInt(amountOutMin),
        BigInt(deadline),
        fee
      ],
      value: fee
    } as const

    const uniswapV3SwapContractCall = {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      abi: UNISWAP_V3_SWAP_ABI as Abi,
      address: UNISWAP_V3_ROUTER,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: token.address,
          tokenOut: WETH_TOKEN,
          fee: 10000,
          recipient: account.address,
          deadline,
          amountIn: tokenAmount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        }
      ],
      value: fee
    } as const

    const swapContractCall =
      coin.dexKind === 'uniV2'
        ? uniswapV2SwapContractCall
        : coin.dexKind === 'uniV3'
          ? uniswapV3SwapContractCall
          : undefined

    if (isNull(swapContractCall)) {
      throw new Error('Invalid dex kind')
    }

    if (await this.isBatchSupported()) {
      const result = await writeContracts(walletClient, {
        contracts: [
          // approve
          ...(allowance < tokenAmount ? [approveContractCall] : []),
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
      if (allowance < tokenAmount) {
        const data = encodeFunctionData(approveContractCall)
        const txParams = {
          to: coin.contractAddress,
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
        to: spender,
        data,
        value: fee,
        account,
        chain: base
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

  private async sellFromMemecoin(params: SellFrontendParams): Promise<HexString> {
    const { coin, amountIn, amountOut, affiliate, slippage, allowance } = params

    const walletClient = this.walletClient

    const minETHAmount = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const memePool = coin.memePool
    if (isNull(memePool)) {
      throw new Error('Meme pool is required for memecoin trade')
    }

    const approveContractCall = {
      address: coin.contractAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [memePool, amountIn]
    } as const

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const abi = getSellTokensABI(memePool) as Abi

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    if (isNull(allowance)) {
      throw new Error('Allowance is required for sell')
    }

    const sellContractCall = {
      address: memePool,
      abi,
      functionName: 'sellTokens',
      args: [coin.contractAddress, amountIn, minETHAmount, affiliate ?? FEE_COLLECTOR]
    }

    if (await this.isBatchSupported()) {
      const result = await writeContracts(walletClient, {
        contracts: [...(allowance < amountIn ? [approveContractCall] : []), sellContractCall],
        chain: base,
        account
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
      if (isNull(lastReceipt) || isNull(lastReceipt.transactionHash)) {
        throw new Error('Transaction failed or reverted')
      }

      return lastReceipt.transactionHash
    } else {
      if (allowance < amountIn) {
        const data = encodeFunctionData(approveContractCall)

        const txParams = {
          to: coin.contractAddress,
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
          confirmations: 1
        })
      }

      const data = encodeFunctionData(sellContractCall)

      const txParams = {
        to: coin.memePool,
        data,
        account,
        chain: base
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

  private async swapCoinFrontend(params: SwapFrontendParams): Promise<HexString> {
    const { fromToken, toToken, amountIn, amountOut, slippage, affiliate } = params

    const walletClient = this.walletClient

    if (fromToken === 'eth' || toToken === 'eth') {
      throw new Error('ETH is not supported as a fromToken or toToken')
    }

    const { allowance } = params

    const amountOutMin = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const approveContractCall = {
      address: fromToken.contractAddress,
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
      args: [MEME_V3.MEME_SWAP, amountIn]
    } as const

    const swapContractCall = {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      abi: SWAP_MEMECOIN_ABI as Abi,
      address: MEME_V3.MEME_SWAP,
      functionName: 'swap',
      args: [
        fromToken.contractAddress,
        toToken.contractAddress,
        amountIn,
        BigInt(amountOutMin),
        affiliate ?? FEE_COLLECTOR
      ]
    } as const

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    if (await this.isBatchSupported()) {
      const result = await writeContracts(walletClient, {
        contracts: [
          // approve
          ...(allowance < amountIn ? [approveContractCall] : []),
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
      if (allowance < amountIn) {
        const data = encodeFunctionData(approveContractCall)
        const txParams = {
          to: fromToken.contractAddress,
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
        to: MEME_V3.MEME_SWAP,
        data,
        account,
        chain: base
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

  async swap(params: TradeSwapParams): Promise<HexString> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    const { fromToken, toToken } = params

    if (fromToken === 'eth') {
      if (isSwapFrontendParams(params)) {
        return this.buy({
          ...params,
          coin: toToken,
          using: 'eth'
        })
      } else {
        const to = toToken
        if (isEthAddressOrEth(to)) {
          return this.buy({
            ...params,
            coin: to,
            using: 'eth'
          })
        } else {
          throw new Error('Invalid swap params')
        }
      }
    } else if (toToken === 'eth') {
      if (isSwapFrontendParams(params)) {
        return this.sell({
          ...params,
          coin: fromToken,
          using: 'eth'
        })
      } else {
        const from = fromToken
        if (isEthAddressOrEth(from)) {
          return this.sell({
            ...params,
            coin: from,
            using: 'eth'
          })
        } else {
          throw new Error('Invalid swap params')
        }
      }
    } else {
      if (isSwapFrontendParams(params)) {
        return this.swapCoinFrontend(params)
      } else {
        if (params.toToken === 'eth') {
          throw new Error('ETH is not supported as a toToken')
        }

        const walletClient = this.walletClient
        const address = walletClient.account?.address
        if (isNull(address)) {
          throw new Error('No account found')
        }

        const [from, to, amountOut, allowance] = await Promise.all([
          this.getCoin(params.fromToken),
          this.getCoin(params.toToken),
          this.estimateSwap(params),
          this.getERC20Allowance(params.fromToken, MEME_V3.MEME_SWAP, address)
        ])

        return this.swapCoinFrontend({
          ...params,
          fromToken: from,
          toToken: to,
          allowance,
          amountOut
        })
      }
    }
  }

  async launch(params: LaunchCoinParams): Promise<LaunchCoinResponse> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    const walletClient = this.walletClient

    const teamFee = await this.teamFee

    const {
      antiSnipeAmount,
      name,
      ticker,
      description,
      image,
      website,
      twitter,
      telegram,
      discord,
      lockingDays,
      farcasterId,
      kind
    } = params

    let contractAddress: EthAddress
    let txHash: HexString

    const tokenData = encodeOnchainData({
      image,
      description,
      website,
      twitter,
      telegram,
      discord,
      farcasterId
    })

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    switch (kind) {
      case 'bonding-curve': {
        const memeDeployer = CURRENT_MEME_INFO.DEPLOYER

        const abi = getCreateMemeABI(memeDeployer)

        const data = encodeFunctionData({
          abi,
          functionName: 'CreateMeme',
          args: [
            name,
            ticker,
            tokenData,
            INITIAL_SUPPLY,
            INITIAL_RESERVE,
            WETH_TOKEN.toString(),
            UNISWAP_V2_ROUTER,
            antiSnipeAmount > BigInt(0),
            antiSnipeAmount,
            BigInt(lockingDays ?? 0)
          ]
        })

        const txParams = {
          to: memeDeployer,
          data,
          account,
          chain: base,
          value: INITIAL_RESERVE + teamFee + antiSnipeAmount
        }

        txHash = await walletClient.sendTransaction(txParams)

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 3
        })

        contractAddress = this.getContractAddressFromLogs(receipt.logs, memeDeployer, 2)

        break
      }
      case 'direct': {
        const { tick, fee, salt } = params

        const data = encodeFunctionData({
          abi: UNISWAPV3_LAUNCH_ABI,
          functionName: 'launch',
          args: [name, ticker, INITIAL_SUPPLY, tick, fee, salt, account.address, tokenData]
        })

        const txParams = {
          to: UNISWAP_V3_LAUNCHER,
          data,
          account,
          chain: base,
          value: antiSnipeAmount
        }

        txHash = await walletClient.sendTransaction(txParams)

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 3
        })

        contractAddress = this.getContractAddressFromLogs(receipt.logs, UNISWAP_V3_LAUNCHER, 1)

        break
      }
    }

    return {
      contractAddress,
      txHash
    }
  }

  private calculateMinAmountWithSlippage(amount: bigint, slippagePercentage: number = 5): bigint {
    const bnAmount = new BigNumber(amount.toString())
    const bnSlippage = new BigNumber(100 - slippagePercentage).dividedBy(100)
    const result = bnAmount.multipliedBy(bnSlippage)
    return BigInt(result.toFixed(0))
  }

  async getERC20Allowance(
    tokenAddress: EthAddress,
    spenderAddress: EthAddress,
    accountAddress: EthAddress
  ): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-erc20-allowance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenAddress, spenderAddress, accountAddress })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async marketCapToTick(params: MarketCapToTickParams): Promise<number> {
    const { marketCap, totalSupply, blockNumber, fee } = params

    const [tickSpacing, { price: ethPrice }] = await Promise.all([
      getUniswapV3TickSpacing(fee, this.publicClient),
      fetchEthereumPrice(blockNumber, this.publicClient)
    ])

    const price = new BigNumber(marketCap).dividedBy(totalSupply).dividedBy(ethPrice)

    const tick = Math.log(price.toNumber()) / LN_1_0001

    const roundedTick = Math.round(tick / tickSpacing) * tickSpacing

    return roundedTick
  }

  async generateSalt(params: GenerateSaltParams): Promise<HexString> {
    const account = this.walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const { name, symbol, supply, ...onchainData } = params

    const tokenData = encodeOnchainData(onchainData)

    const result = await retry(() =>
      this.publicClient.readContract({
        address: UNISWAP_V3_LAUNCHER,
        abi: UNISWAPV3_GENERATE_SALT_ABI,
        functionName: 'generateSalt',
        args: [account.address, name, symbol, supply, tokenData]
      })
    )

    return GenerateSaltResultSchema.parse(result).salt
  }

  async getExpectedOutputAmount(params: LaunchCoinDirectParams): Promise<bigint> {
    const account = this.walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const { name, ticker, antiSnipeAmount, tick, fee, salt, ...onchainData } = params

    const tokenData = encodeOnchainData(onchainData)

    const launchArgs = {
      _name: name,
      _symbol: ticker,
      _supply: INITIAL_SUPPLY,
      _initialTick: tick,
      _fee: fee,
      _salt: salt,
      _deployer: account.address,
      _data: tokenData
    }

    const launchTx = {
      address: UNISWAP_V3_LAUNCHER,
      abi: UNISWAPV3_LAUNCH_ABI,
      functionName: 'launch',
      args: Object.values(launchArgs),
      value: antiSnipeAmount,
      account
    }

    const { result } = await this.publicClient.simulateContract(launchTx)

    const [, , amountSwapped] = LaunchResultSchema.parse(result)

    return amountSwapped
  }

  private getContractAddressFromLogs(
    logs: Log[],
    contractAddress: EthAddress,
    topicIndex: number
  ): EthAddress {
    const log = logs.find((log) => log.address.toLowerCase() === contractAddress.toLowerCase())
    const topic = log?.topics[topicIndex]

    if (isNull(log)) {
      throw new Error('Failed to find logs for create coin')
    }

    if (isNull(topic)) {
      throw Error('Failed to find topic')
    }

    return EthAddressSchema.parse(`0x${topic.slice(26)}`)
  }

  private getUniswapContract(coin: HydratedCoin): EthAddress {
    switch (coin.dexKind) {
      case 'uniV2':
        return UNISWAP_V2_ROUTER_PROXY
      case 'uniV3':
        return UNISWAP_V3_ROUTER
    }
  }
}

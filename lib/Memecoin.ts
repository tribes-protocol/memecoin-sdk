import { SWAP_EXACT_ETH_FOR_TOKENS_ABI, SWAP_EXACT_TOKENS_FOR_ETH_ABI } from '@/abi'
import {
  API_BASE_URL,
  CURRENT_MEME_INFO,
  encodeOnchainData,
  getBuyManyTokensABI,
  getBuyTokensABI,
  getCreateMemeABI,
  getSellTokensABI,
  INITIAL_RESERVE,
  INITIAL_SUPPLY,
  isBatchSupported,
  MEME_V3,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_PROXY,
  WETH_TOKEN
} from '@/constants'
import { isNull, isRequiredNumber, isValidBigIntString } from '@/functions'
import {
  BuyManyParams,
  EstimateTradeParams,
  EthAddress,
  EthAddressSchema,
  GenerateCoinParams,
  GenerateMemecoinFromPhraseResponse,
  GenerateMemecoinFromPhraseResponseSchema,
  HexString,
  HydratedCoin,
  HydratedCoinSchema,
  LaunchCoinParams,
  TradeParams
} from '@/types'
import { ChainId, CurrencyAmount, Percent, Token, WETH9 } from '@uniswap/sdk-core'
import { Pair, Route, Trade } from '@uniswap/v2-sdk'
import BigNumber from 'bignumber.js'
import {
  Abi,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  PublicClient,
  WalletCapabilities,
  WalletCapabilitiesRecord,
  WalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { eip5792Actions, getCapabilities, writeContracts } from 'viem/experimental'

const FEE_COLLECTOR = CURRENT_MEME_INFO.FEE_COLLECTOR

export type MemecoinSDKConfig = {
  rpcUrl: string
  apiBaseUrl?: string
  walletClient?: WalletClient
  privateKey?: HexString // for backend
}

const slippageTolerance = new Percent('500', '10000')

export class MemecoinSDK {
  private readonly rpcUrl: string
  private readonly apiBaseUrl: string
  private readonly publicClient: PublicClient
  private readonly walletClient: WalletClient | undefined

  constructor(config: MemecoinSDKConfig) {
    this.rpcUrl = config.rpcUrl
    this.apiBaseUrl = config.apiBaseUrl ?? API_BASE_URL
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(this.rpcUrl)
    }) as PublicClient

    this.walletClient = config.privateKey
      ? createWalletClient({
          account: privateKeyToAccount(config.privateKey),
          transport: http(config.rpcUrl)
        })
      : config.walletClient
  }

  private getWalletClient(): WalletClient {
    if (isNull(this.walletClient)) {
      throw new Error('Read only mode, pass a private key or use under wagmi provider')
    }
    return this.walletClient
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
        memeTokenAddress: coin.contractAddress,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async buy(params: TradeParams): Promise<HexString> {
    const { coin } = params
    const walletClient = this.getWalletClient()

    if (coin.dexInitiated) {
      return this.buyFromUniswap(params, walletClient)
    } else {
      return this.buyFromMemecoin(params, walletClient, coin.memePool)
    }
  }

  private async buyFromUniswap(
    params: TradeParams,
    walletClient: WalletClient
  ): Promise<HexString> {
    const { coin, amountIn: ethAmount, slippage, pair, capabilities } = params

    const token = new Token(ChainId.BASE, coin.contractAddress, 18)
    const weth = WETH9[ChainId.BASE]
    if (isNull(weth)) {
      throw new Error('WETH9 is not supported on this chain')
    }

    if (isNull(pair)) {
      throw new Error('Pair is required for uniswap trade')
    }

    const route = new Route([pair], weth, token)
    const amountIn = CurrencyAmount.fromRawAmount(weth, ethAmount.toString())
    const trade = Trade.exactIn(route, amountIn)

    const slippageTolerancePercent = slippage
      ? new Percent(slippage.toString(), '100')
      : slippageTolerance

    const amountOutMin = trade.minimumAmountOut(slippageTolerancePercent).quotient.toString()
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    const fee = (ethAmount * 17n) / 1000n // 1.7% fee

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const contractParams = {
      abi: SWAP_EXACT_ETH_FOR_TOKENS_ABI,
      functionName: 'swapExactETHForTokens',
      args: [token.address, amountOutMin, deadline, fee]
    }

    const data = encodeFunctionData(contractParams)

    const txParams = {
      to: UNISWAP_V2_ROUTER_PROXY,
      data,
      value: ethAmount,
      account,
      chain: base
    }

    const batchSupported = isBatchSupported(capabilities)

    const tx = batchSupported
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

  private async buyFromMemecoin(
    params: TradeParams,
    walletClient: WalletClient,
    memePool: EthAddress
  ): Promise<HexString> {
    const { coin, amountIn, amountOut, affiliate, slippage, lockingDays, capabilities } = params

    const minTokens = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const abi = getBuyTokensABI(memePool)

    const args = [coin.contractAddress, minTokens, affiliate ?? CURRENT_MEME_INFO.FEE_COLLECTOR]
    if (memePool === MEME_V3.POOL) {
      args.push(BigInt(lockingDays ?? 0)) // Locking days
    }

    const batchSupported = isBatchSupported(capabilities)

    const data = encodeFunctionData({
      abi,
      functionName: 'buyTokens',
      args
    })

    const txParams = {
      to: memePool,
      data,
      value: amountIn,
      account,
      chain: base
    }

    const tx = batchSupported
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

  async buyManyMemecoins(params: BuyManyParams): Promise<HexString> {
    const walletClient = this.getWalletClient()

    const { memeCoins, ethAmounts, expectedTokensAmounts, affiliate, lockingDays, capabilities } =
      params

    const minTokensAmounts = expectedTokensAmounts.map((amount) =>
      this.calculateMinAmountWithSlippage(amount)
    )

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    // Which memepool to use
    if (isNull(memeCoins[0])) {
      throw new Error('No token addresses provided')
    }

    const memePool = memeCoins[0].memePool
    const abi = getBuyManyTokensABI(memePool)

    const args = [
      memeCoins.map((coin) => coin.contractAddress),
      minTokensAmounts,
      ethAmounts,
      affiliate ?? FEE_COLLECTOR
    ]
    if (memePool === MEME_V3.POOL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args.push(BigInt(lockingDays ?? 0) as any) // Locking days
    }

    const data = encodeFunctionData({
      abi,
      functionName: 'buyManyTokens',
      args
    })

    const txParams = {
      to: memePool,
      data,
      value: ethAmounts.reduce((acc, curr) => acc + curr, BigInt(0)),
      account,
      chain: base
    }

    const batchSupported = isBatchSupported(capabilities)

    const tx = batchSupported
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
        memeTokenAddress: coin.contractAddress,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async sell(params: TradeParams): Promise<HexString> {
    const { coin } = params
    const walletClient = this.getWalletClient()

    if (coin.dexInitiated) {
      return this.sellFromUniswap(params, walletClient)
    } else {
      return this.sellFromMemecoin(params, walletClient, coin.memePool)
    }
  }

  private async sellFromUniswap(
    params: TradeParams,
    walletClient: WalletClient
  ): Promise<HexString> {
    const {
      coin,
      amountIn: tokenAmount,
      amountOut,
      slippage,
      pair,
      allowance,
      capabilities
    } = params

    const token = new Token(ChainId.BASE, coin.contractAddress, 18)
    const weth = WETH9[ChainId.BASE]
    if (isNull(weth)) {
      throw new Error('WETH9 is not supported on this chain')
    }

    if (isNull(pair)) {
      throw new Error('Pair is required for uniswap trade')
    }

    const route = new Route([pair], token, weth)
    const amountIn = CurrencyAmount.fromRawAmount(token, tokenAmount.toString())
    const trade = Trade.exactIn(route, amountIn)

    const slippageTolerancePercent = slippage
      ? new Percent(slippage.toString(), '100')
      : slippageTolerance
    const amountOutMin = trade.minimumAmountOut(slippageTolerancePercent).quotient.toString()
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

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
      args: [UNISWAP_V2_ROUTER_PROXY, tokenAmount]
    } as const

    const fee = (amountOut * 17n) / 1000n // 1.7% fee

    const swapContractCall = {
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

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    if (isNull(allowance)) {
      throw new Error('Allowance is required for sell')
    }

    let batchSupported = false
    try {
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
    }

    if (batchSupported) {
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
        to: UNISWAP_V2_ROUTER_PROXY,
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

  private async sellFromMemecoin(
    params: TradeParams,
    walletClient: WalletClient,
    memePool: EthAddress,
    capabilities?: WalletCapabilitiesRecord<WalletCapabilities, number>
  ): Promise<HexString> {
    const { coin, amountIn, amountOut, affiliate, slippage, allowance } = params

    const minETHAmount = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const approveContractCall = {
      address: coin.contractAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [memePool, amountIn]
    } as const

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const abi = getSellTokensABI(memePool) as any

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

    let batchSupported = false
    try {
      batchSupported = isBatchSupported(capabilities)
    } catch {
      // If getCapabilities throws, we'll default to non-batch behavior
      batchSupported = false
    }

    if (batchSupported) {
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
        to: memePool,
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

  async getPair(coin: HydratedCoin): Promise<Pair> {
    const token = new Token(ChainId.BASE, coin.contractAddress, 18)
    const weth = WETH9[ChainId.BASE]
    if (isNull(weth)) {
      throw new Error('WETH9 is not supported on this chain')
    }

    const pairAddress = Pair.getAddress(token, weth)
    const reserves = await this.publicClient.readContract({
      address: EthAddressSchema.parse(pairAddress),
      abi: [
        {
          constant: true,
          inputs: [],
          name: 'getReserves',
          outputs: [
            { name: 'reserve0', type: 'uint112' },
            { name: 'reserve1', type: 'uint112' },
            { name: 'blockTimestampLast', type: 'uint32' }
          ],
          type: 'function'
        }
      ],
      functionName: 'getReserves'
    })

    if (!Array.isArray(reserves) || reserves.length < 2) {
      throw new Error('Invalid reserves')
    }

    const [reserve0, reserve1] = reserves.slice(0, 2).map(BigInt)

    if (isNull(reserve0) || isNull(reserve1)) {
      throw new Error('Invalid reserves')
    }

    const tokens = [token, weth] as const
    const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

    const pair = new Pair(
      CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
      CurrencyAmount.fromRawAmount(token1, reserve1.toString())
    )

    return pair
  }

  async generateCoin(params: GenerateCoinParams): Promise<GenerateMemecoinFromPhraseResponse> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/generate`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
    const data = GenerateMemecoinFromPhraseResponseSchema.parse(await response.json())
    return data
  }

  async launch(params: LaunchCoinParams): Promise<[EthAddress, HexString]> {
    const walletClient = this.getWalletClient()

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
      teamFee,
      lockingDays
    } = params

    const memeDeployer = CURRENT_MEME_INFO.DEPLOYER

    const abi = getCreateMemeABI(memeDeployer)

    const tokenData = encodeOnchainData({
      image,
      description,
      website: website ?? undefined,
      twitter: twitter ?? undefined,
      telegram: telegram ?? undefined,
      discord: discord ?? undefined
    })

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

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

    const tx = await walletClient.sendTransaction(txParams)

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: tx,
      confirmations: 3
    })

    const log = receipt.logs.find((log) => log.address.toLowerCase() === memeDeployer.toLowerCase())
    const topic1 = log?.topics[1]

    if (isNull(log)) {
      throw new Error('Failed to find logs for create coin')
    }

    if (isNull(topic1)) {
      throw Error('Failed to find topic 1')
    }

    const contractAddress = EthAddressSchema.parse(`0x${topic1.slice(26)}`)

    if (isNull(contractAddress)) {
      throw new Error('Failed to create coin')
    }

    return [contractAddress, tx]
  }

  async getTeamFee(): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-team-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memeDeployer: CURRENT_MEME_INFO.DEPLOYER })
    })
    const data = await response.json()
    return BigInt(data)
  }

  async getCapabilities(): Promise<WalletCapabilitiesRecord<WalletCapabilities, number>> {
    const walletClient = this.getWalletClient()
    return await getCapabilities(walletClient)
  }

  private calculateMinAmountWithSlippage(amount: bigint, slippagePercentage: number = 5): bigint {
    const bnAmount = new BigNumber(amount.toString())
    const bnSlippage = new BigNumber(100 - slippagePercentage).dividedBy(100)
    const result = bnAmount.multipliedBy(bnSlippage)
    return BigInt(result.toFixed(0))
  }

  async getERC20Allowance(tokenAddress: EthAddress, spenderAddress: EthAddress): Promise<bigint> {
    const walletClient = this.getWalletClient()

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-erc20-allowance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenAddress, spenderAddress, accountAddress: account.address })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }
}

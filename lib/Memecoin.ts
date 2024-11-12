import {
  SWAP_EXACT_ETH_FOR_TOKENS_ABI,
  SWAP_EXACT_TOKENS_FOR_ETH_ABI,
  SWAP_MEMECOIN_ABI
} from '@/abi'
import {
  API_BASE_URL,
  CURRENT_MEME_INFO,
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
import {
  encodeOnchainData,
  getPair,
  isNull,
  isRequiredNumber,
  isRequiredString,
  isValidBigIntString
} from '@/functions'
import {
  BuyFrontendParams,
  BuyManyParams,
  EstimateSwapCoinParams,
  EstimateSwapParams,
  EstimateTradeParams,
  EthAddress,
  EthAddressSchema,
  HexString,
  HydratedCoin,
  HydratedCoinSchema,
  isEthAddressOrEth,
  isSellFrontendParams,
  isSwapFrontendParams,
  LaunchCoinParams,
  LaunchCoinResponse,
  MemecoinSDKConfig,
  SwapFrontendParams,
  TradeBuyParams,
  TradeSellParams,
  TradeSwapParams
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

const slippageTolerance = new Percent('500', '10000')

export class MemecoinSDK {
  private readonly rpcUrl: string
  private readonly apiBaseUrl: string
  private readonly publicClient: PublicClient
  private readonly walletClient: WalletClient | undefined
  private teamFee: Promise<bigint>
  private teamFeeInterval: NodeJS.Timeout | undefined
  private capabilities: Promise<WalletCapabilitiesRecord<WalletCapabilities, number>> | undefined

  constructor(config: MemecoinSDKConfig) {
    this.rpcUrl = config.rpcUrl
    this.apiBaseUrl = config.apiBaseUrl ?? API_BASE_URL
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(this.rpcUrl)
    }) as PublicClient

    if ('walletClient' in config) {
      this.walletClient = config.walletClient
    } else if ('privateKey' in config && config.privateKey) {
      this.walletClient = createWalletClient({
        account: privateKeyToAccount(config.privateKey),
        chain: base,
        transport: http(this.rpcUrl)
      })
    }

    if (this.walletClient) {
      this.capabilities = getCapabilities(this.walletClient)
    }

    this.teamFee = this.fetchTeamFee()
    this.teamFeeInterval = setInterval(
      async () => {
        this.teamFee = this.fetchTeamFee()
      },
      15 * 60 * 1000
    )
  }

  destroy(): void {
    if (this.teamFeeInterval) {
      clearInterval(this.teamFeeInterval)
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

  private getWalletClient(): WalletClient {
    if (isNull(this.walletClient)) {
      throw new Error('Read only mode, pass a wallet client for write operations')
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

  private async estimateBuy(params: EstimateTradeParams): Promise<bigint> {
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

  private async buy(params: TradeBuyParams): Promise<HexString> {
    if (isBuyFrontendParams(params)) {
      if (params.coin.dexInitiated) {
        return this.buyFromUniswap(params)
      } else {
        return this.buyFromMemecoin(params, params.coin.memePool)
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
      let pair: Pair | undefined
      if (coin.dexInitiated) {
        pair = await getPair(coin.contractAddress, this.publicClient)
        return this.buyFromUniswap({
          ...params,
          coin,
          amountOut,
          pair
        })
      } else {
        return this.buyFromMemecoin({ ...params, coin, amountOut }, coin.memePool)
      }
    }
  }

  private async buyFromUniswap(params: BuyFrontendParams): Promise<HexString> {
    const { coin, amountIn: ethAmount, slippage, pair } = params

    const walletClient = this.getWalletClient()
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

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
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

  private async buyFromMemecoin(
    params: BuyFrontendParams,
    memePool: EthAddress
  ): Promise<HexString> {
    const walletClient = this.getWalletClient()

    const { coin, amountIn, amountOut, affiliate, slippage, lockingDays } = params

    const minTokens = this.calculateMinAmountWithSlippage(amountOut, slippage)

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const abi = getBuyTokensABI(memePool)

    const args = [
      coin.contractAddress,
      minTokens,
      affiliate ?? CURRENT_MEME_INFO.FEE_COLLECTOR,
      BigInt(lockingDays ?? 0)
    ]

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
    }

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

    const { memeCoins, ethAmounts, expectedTokensAmounts, affiliate, lockingDays } = params

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

    let memePool: EthAddress
    const firstCoin = memeCoins[0]

    if (isNull(firstCoin)) {
      throw new Error('No token addresses provided')
    }

    if (isRequiredString(firstCoin)) {
      memePool = (await this.getCoin(firstCoin)).memePool
    } else {
      memePool = firstCoin.memePool
    }

    const abi = getBuyManyTokensABI(memePool)

    const args = [
      memeCoins.map((coin) => (isRequiredString(coin) ? coin : coin.contractAddress)),
      minTokensAmounts,
      ethAmounts,
      affiliate ?? FEE_COLLECTOR,
      BigInt(lockingDays ?? 0)
    ]

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

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
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

  private async estimateSell(params: EstimateTradeParams): Promise<bigint> {
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

  private async sell(params: TradeSellParams): Promise<HexString> {
    if (isSellFrontendParams(params)) {
      if (params.coin.dexInitiated) {
        return this.sellFromUniswap(params)
      } else {
        return this.sellFromMemecoin(params, params.coin.memePool)
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

      const walletClient = this.getWalletClient()
      const address = walletClient.account?.address
      if (isNull(address)) {
        throw new Error('No account found')
      }

      const allowance = await this.getERC20Allowance(coin.contractAddress, coin.memePool, address)

      let pair: Pair | undefined
      if (coin.dexInitiated) {
        pair = await getPair(coin.contractAddress, this.publicClient)
        return this.sellFromUniswap({
          ...params,
          coin,
          amountOut,
          pair,
          allowance
        })
      } else {
        return this.sellFromMemecoin({ ...params, coin, amountOut, allowance }, coin.memePool)
      }
    }
  }

  private async sellFromUniswap(params: SellFrontendParams): Promise<HexString> {
    const { coin, amountIn: tokenAmount, amountOut, slippage, pair, allowance } = params

    const walletClient = this.getWalletClient()

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

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
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
    params: SellFrontendParams,
    memePool: EthAddress
  ): Promise<HexString> {
    const { coin, amountIn, amountOut, affiliate, slippage, allowance } = params

    const walletClient = this.getWalletClient()

    const minETHAmount = this.calculateMinAmountWithSlippage(amountOut, slippage)

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

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
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

  private async swapCoin(params: SwapFrontendParams): Promise<HexString> {
    const { fromToken, toToken, amountIn, amountOut, slippage, affiliate } = params

    const walletClient = this.getWalletClient()

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

    let batchSupported = false
    try {
      const capabilities = await this.capabilities
      batchSupported = isBatchSupported(capabilities)
    } catch {
      batchSupported = false
    }

    if (batchSupported) {
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
        return this.swapCoin(params)
      } else {
        if (params.toToken === 'eth') {
          throw new Error('ETH is not supported as a toToken')
        }

        const walletClient = this.getWalletClient()
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

        return this.swapCoin({
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
    const walletClient = this.getWalletClient()

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

    return {
      contractAddress,
      txHash: tx
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
}

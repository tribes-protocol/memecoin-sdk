import {
  BONDING_CURVE_TOKEN_CREATED_EVENT_ABI,
  BUY_BONDING_CURVE_TOKENS_ABI,
  DEPLOY_TOKEN_ABI,
  SELL_BONDING_CURVE_TOKENS_ABI,
  SWAP_EXACT_ETH_FOR_TOKENS_ABI,
  SWAP_EXACT_TOKENS_FOR_ETH_ABI,
  TOKEN_CREATED_EVENT_ABI,
  UNISWAP_V3_PREDICT_TOKEN,
  UNISWAP_V3_ROUTER_ABI,
  UNISWAP_V3_SWAP_ABI,
  UNISWAPV3_GENERATE_SALT_ABI,
  UNISWAPV3_LAUNCH_ABI
} from '@/abi'
import { MemecoinAPI } from '@/api'
import {
  API_BASE_URL,
  BONDING_CURVE_TOKEN_DEPLOYER,
  getBuyTokensABI,
  getSellTokensABI,
  INITIAL_SUPPLY,
  LN_1_0001,
  MULTISIG_FEE_COLLECTOR,
  UNISWAP_V2_ROUTER_PROXY,
  UNISWAP_V3_LAUNCHER,
  UNISWAP_V3_ROUTER,
  WETH_TOKEN
} from '@/constants'
import { calculateMinAmountWithSlippage, isBatchSupported, isNull, retry } from '@/functions'
import { TokenSwapper } from '@/tokenSwapper'
import {
  BondingCurveTokenCreatedEventArgsSchema,
  BuyFrontendParams,
  DexMetadata,
  EstimateLaunchBuyParams,
  EstimateSwapParams,
  EstimateTradeParams,
  EthAddress,
  EthAddressSchema,
  GenerateSaltParams,
  GenerateSaltResultSchema,
  HexString,
  HydratedCoin,
  isBuyFrontendParams,
  isSellFrontendParams,
  LaunchCoinParams,
  LaunchCoinResponse,
  LaunchResultSchema,
  MarketCapToTickParams,
  MemecoinSDKConfig,
  NewCoin,
  PredictTokenParams,
  SellFrontendParams,
  SwapEstimation,
  SwapParams,
  TokenCreatedEventArgsSchema,
  TradeBuyParams,
  TradeSellParams
} from '@/types'
import { fetchEthereumPrice, getUniswapPair, getUniswapV3TickSpacing } from '@/uniswap'
import { ChainId, Token, WETH9 } from '@uniswap/sdk-core'
import BigNumber from 'bignumber.js'
import {
  Abi,
  Account,
  Chain,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  erc20Abi,
  http,
  parseEther,
  PublicClient,
  WalletCapabilities,
  WalletCapabilitiesRecord,
  WalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { eip5792Actions, getCapabilities, writeContracts } from 'viem/experimental'

export class MemecoinSDK {
  private readonly config: MemecoinSDKConfig
  private readonly rpcUrl: string
  private readonly apiBaseUrl: string
  private readonly tokenSwapper: TokenSwapper
  private readonly api: MemecoinAPI

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
    this.api = new MemecoinAPI(this.apiBaseUrl)
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

    this.tokenSwapper = new TokenSwapper(this.publicClient, this.walletClient, this.api)
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

  async getCoin(id: EthAddress | number): Promise<HydratedCoin | undefined> {
    return this.api.getCoin(id)
  }

  async getTrending(): Promise<HydratedCoin[]> {
    return this.api.getTrending()
  }

  async estimateBuy(params: EstimateTradeParams): Promise<bigint> {
    return this.api.estimateBuy(params.coin, params.amountIn)
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

      if (isNull(coin)) {
        throw new Error('Coin not found')
      }

      if (coin.dexInitiated && coin.dexKind !== 'univ3-bonding') {
        return this.buyFromUniswap({
          ...params,
          coin,
          amountOut,
          pair:
            coin.dexKind === 'univ2'
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

    if (isNull(pair) && coin.dexKind === 'univ2') {
      throw new Error('Pair is required for uniswap trade')
    }

    const amountOutMin = calculateMinAmountWithSlippage(amountOut, slippage)

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

    const contractParams = (() => {
      switch (coin.dexKind) {
        case 'univ2':
          return uniswapV2SwapContractCall
        case 'univ3':
          return uniswapV3SwapContractCall
        case 'univ3-bonding':
          throw new Error('Univ3 bonding should be bought from memecoin')
      }
    })()

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

    const minTokens = calculateMinAmountWithSlippage(amountOut, slippage)

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    let txParams: {
      to: EthAddress
      data: HexString
      value: bigint
      account: Account
      chain: Chain
    }

    switch (coin.dexKind) {
      case 'univ3-bonding': {
        const args = [
          account.address,
          account.address,
          affiliate ?? MULTISIG_FEE_COLLECTOR,
          '',
          0,
          minTokens,
          0,
          BigInt(lockingDays ?? 0)
        ]

        const data = encodeFunctionData({
          abi: BUY_BONDING_CURVE_TOKENS_ABI,
          functionName: 'buy',
          args
        })

        txParams = {
          to: coin.contractAddress,
          data,
          value: amountIn,
          account,
          chain: base
        }
        break
      }
      case 'univ2': {
        if (isNull(coin.memePool)) {
          throw new Error('Meme pool is required for memecoin trade')
        }

        const abi = getBuyTokensABI(coin.memePool)

        const args = [
          coin.contractAddress,
          minTokens,
          affiliate ?? MULTISIG_FEE_COLLECTOR,
          BigInt(lockingDays ?? 0)
        ]

        const data = encodeFunctionData({
          abi,
          functionName: 'buyTokens',
          args
        })

        txParams = {
          to: coin.memePool,
          data,
          value: amountIn,
          account,
          chain: base
        }

        break
      }
      case 'univ3':
        throw new Error('Univ3 is not supported for memecoin buy')
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
    return this.api.estimateSell(params.coin, params.amountIn)
  }

  async estimateSwap(params: EstimateSwapParams): Promise<SwapEstimation> {
    return this.tokenSwapper.estimateSwap(params)
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

      if (isNull(coin)) {
        throw new Error('Coin not found')
      }

      if (coin.dexInitiated && coin.dexKind !== 'univ3-bonding') {
        const spender = this.getUniswapContract(coin)

        const allowance = await this.getERC20Allowance(coin.contractAddress, spender, address)

        return this.sellFromUniswap({
          ...params,
          coin,
          amountOut,
          pair:
            coin.dexKind === 'univ2'
              ? await getUniswapPair(coin.contractAddress, this.publicClient)
              : undefined,
          allowance
        })
      } else {
        let poolContractAddress: EthAddress
        switch (coin.dexKind) {
          case 'univ2':
            if (isNull(coin.memePool)) {
              throw new Error('Meme pool is required for memecoin trade')
            }

            poolContractAddress = coin.memePool
            break
          case 'univ3-bonding':
            poolContractAddress = coin.contractAddress
            break
          case 'univ3':
            throw new Error('Univ3 is not supported for memecoin sell')
        }

        const allowance = await this.getERC20Allowance(
          coin.contractAddress,
          poolContractAddress,
          address
        )

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

    if (isNull(pair) && coin.dexKind === 'univ2') {
      throw new Error('Pair is required for uniswap trade')
    }

    const amountOutMin = calculateMinAmountWithSlippage(amountOut, slippage)
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
      abi: UNISWAP_V3_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: token.address,
          tokenOut: WETH_TOKEN,
          fee: 10000,
          recipient: '0x0000000000000000000000000000000000000002',
          deadline,
          amountIn: tokenAmount,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0
        }
      ]
    } as const

    const uniswapV3UnwrapEthContractCall = {
      abi: UNISWAP_V3_ROUTER_ABI,
      functionName: 'unwrapWETH9',
      args: [amountOutMin, account.address]
    } as const

    const dataSwap1 = encodeFunctionData(uniswapV3SwapContractCall)
    const dataSwap2 = encodeFunctionData(uniswapV3UnwrapEthContractCall)

    const uniswapV3MulticallContractCall = {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      abi: UNISWAP_V3_ROUTER_ABI as Abi,
      address: UNISWAP_V3_ROUTER,
      functionName: 'multicall',
      args: [[dataSwap1, dataSwap2]]
    } as const

    const swapContractCall = (() => {
      switch (coin.dexKind) {
        case 'univ2':
          return uniswapV2SwapContractCall
        case 'univ3':
          return uniswapV3MulticallContractCall
        case 'univ3-bonding':
          throw new Error('Univ3 bonding should be bought from memecoin')
      }
    })()

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
        value: coin.dexKind === 'univ2' ? fee : 0n,
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

    const minETHAmount = calculateMinAmountWithSlippage(amountOut, slippage)

    let poolContractAddress: EthAddress
    switch (coin.dexKind) {
      case 'univ2': {
        if (isNull(coin.memePool)) {
          throw new Error('Meme pool is required for memecoin trade')
        }

        poolContractAddress = coin.memePool
        break
      }
      case 'univ3-bonding':
        poolContractAddress = coin.contractAddress
        break
      case 'univ3':
        throw new Error('Univ3 is not supported for memecoin sell')
    }

    const approveContractCall = {
      address: coin.contractAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [poolContractAddress, amountIn]
    } as const

    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    if (isNull(allowance)) {
      throw new Error('Allowance is required for sell')
    }

    let sellContractCall: {
      address: EthAddress
      abi: Abi
      functionName: string
      args: (string | bigint | number)[]
    }

    switch (coin.dexKind) {
      case 'univ2': {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const abi = getSellTokensABI(poolContractAddress) as Abi

        sellContractCall = {
          address: poolContractAddress,
          abi,
          functionName: 'sellTokens',
          args: [coin.contractAddress, amountIn, minETHAmount, affiliate ?? MULTISIG_FEE_COLLECTOR]
        }
        break
      }
      case 'univ3-bonding': {
        sellContractCall = {
          address: poolContractAddress,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          abi: SELL_BONDING_CURVE_TOKENS_ABI as Abi,
          functionName: 'sell',
          args: [
            amountIn,
            account.address,
            affiliate ?? MULTISIG_FEE_COLLECTOR,
            '',
            0,
            minETHAmount,
            0
          ]
        }
        break
      }
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
        to: poolContractAddress,
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

  async swap(params: SwapParams): Promise<HexString> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    return this.tokenSwapper.swap(params, isBatchSupported)
  }

  async launch(launchParams: LaunchCoinParams): Promise<LaunchCoinResponse> {
    const isBatchSupported = await this.isBatchSupported()
    if (!isBatchSupported) {
      await this.switchToBaseChain()
    }

    const walletClient = this.walletClient

    const { antiSnipeAmount, lockingDays, kind, name, ticker } = launchParams

    let contractAddress: EthAddress
    let txHash: HexString
    let dexMetadata: DexMetadata | undefined
    let blockNumber: bigint | undefined
    const tokenData = ''
    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    switch (kind) {
      case 'bonding-curve': {
        const abi = DEPLOY_TOKEN_ABI

        const deployData = encodeFunctionData({
          abi,
          functionName: 'deploy',
          args: [account.address, '', name, ticker, lockingDays ?? 0]
        })

        const txParams = {
          to: BONDING_CURVE_TOKEN_DEPLOYER,
          data: deployData,
          account,
          chain: base,
          value: antiSnipeAmount + parseEther('0.00001')
        }

        txHash = await walletClient.sendTransaction(txParams)

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 3
        })

        const log = receipt.logs.find(
          (log) => log.address.toLowerCase() === BONDING_CURVE_TOKEN_DEPLOYER.toLowerCase()
        )
        if (isNull(log)) {
          throw new Error('Failed to find logs for create coin')
        }

        const { data, topics } = log

        const topicHash = topics[0]
        if (isNull(topicHash)) {
          throw new Error('Failed to find topic hash')
        }

        const parsedLog = decodeEventLog({
          abi: BONDING_CURVE_TOKEN_CREATED_EVENT_ABI,
          data,
          topics: [topicHash, ...topics.slice(1)]
        })

        const args = BondingCurveTokenCreatedEventArgsSchema.parse(parsedLog.args)

        contractAddress = args.tokenAddress

        break
      }
      case 'direct': {
        const { tick, fee, salt } = launchParams

        const launchData = encodeFunctionData({
          abi: UNISWAPV3_LAUNCH_ABI,
          functionName: 'launch',
          args: [name, ticker, INITIAL_SUPPLY, tick, fee, salt, account.address, tokenData]
        })

        const txParams = {
          to: UNISWAP_V3_LAUNCHER,
          data: launchData,
          account,
          chain: base,
          value: antiSnipeAmount + parseEther('0.00001')
        }

        txHash = await walletClient.sendTransaction(txParams)

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: 3
        })

        const log = receipt.logs.find(
          (log) => log.address.toLowerCase() === UNISWAP_V3_LAUNCHER.toLowerCase()
        )
        if (isNull(log)) {
          throw new Error('Failed to find logs for create coin')
        }

        const { data, topics } = log

        const topicHash = topics[0]
        if (isNull(topicHash)) {
          throw new Error('Failed to find topic hash')
        }

        const parsedLog = decodeEventLog({
          abi: TOKEN_CREATED_EVENT_ABI,
          data,
          topics: [topicHash, ...topics.slice(1)]
        })

        const args = TokenCreatedEventArgsSchema.parse(parsedLog.args)

        dexMetadata = {
          lpNftId: args.lpNftId.toString(),
          lockerAddress: args.lockerAddress
        }

        blockNumber = receipt.blockNumber

        contractAddress = args.tokenAddress

        break
      }
    }

    await this.launchCoin(
      {
        ...launchParams,
        dexMetadata: dexMetadata ? JSON.stringify(dexMetadata) : null,
        dexInitiated: kind === 'direct',
        dexInitiatedBlock: kind === 'direct' && blockNumber ? blockNumber : null,
        censored: false,
        contractAddress,
        creator: account.address,
        chainId: base.id,
        totalSupply: INITIAL_SUPPLY,
        dexKind: kind === 'bonding-curve' ? 'univ3-bonding' : 'univ3'
      },
      txHash
    )

    return {
      contractAddress,
      txHash
    }
  }

  private async launchCoin(coin: NewCoin, txHash: HexString): Promise<void> {
    return this.api.launchCoin(coin, txHash)
  }

  async getERC20Allowance(
    tokenAddress: EthAddress,
    spenderAddress: EthAddress,
    accountAddress: EthAddress
  ): Promise<bigint> {
    return this.api.getERC20Allowance(tokenAddress, spenderAddress, accountAddress)
  }

  async calculateDirectLaunchTick(params: MarketCapToTickParams): Promise<number> {
    const { marketCap, totalSupply, fee } = params

    const [tickSpacing, { price: ethPrice }] = await Promise.all([
      getUniswapV3TickSpacing(fee, this.publicClient),
      fetchEthereumPrice(this.publicClient)
    ])

    const totalSupplyNumber = new BigNumber(totalSupply.toString())
    const price = new BigNumber(marketCap).dividedBy(totalSupplyNumber).dividedBy(ethPrice)

    const tick = Math.log(price.toNumber()) / LN_1_0001

    const roundedTick = Math.round(tick / tickSpacing) * tickSpacing

    return roundedTick
  }

  async generateDirectLaunchSalt(params: GenerateSaltParams): Promise<HexString> {
    const { account, name, symbol, supply } = params

    const tokenData = ''

    const result = await retry(() =>
      this.publicClient.readContract({
        address: UNISWAP_V3_LAUNCHER,
        abi: UNISWAPV3_GENERATE_SALT_ABI,
        functionName: 'generateSalt',
        args: [account, name, symbol, supply, tokenData]
      })
    )

    if (!Array.isArray(result)) {
      throw new Error(`Invalid response format: ${result}`)
    }

    return GenerateSaltResultSchema.parse({
      salt: result[0],
      token: result[1]
    }).salt
  }

  async predictDirectLaunchToken(params: PredictTokenParams): Promise<HexString> {
    const { account, name, symbol, supply, salt } = params

    const tokenData = ''

    const result = await retry(() =>
      this.publicClient.readContract({
        address: UNISWAP_V3_LAUNCHER,
        abi: UNISWAP_V3_PREDICT_TOKEN,
        functionName: 'predictToken',
        args: [account, name, symbol, supply, tokenData, salt]
      })
    )

    return EthAddressSchema.parse(result)
  }

  async estimateLaunchBuy(params: EstimateLaunchBuyParams): Promise<bigint> {
    if (params.kind !== 'direct') {
      throw new Error('Only direct launch is currentlysupported')
    }

    const { name, ticker, antiSnipeAmount, account, tick, fee, salt } = params

    const tokenData = ''

    const launchArgs = {
      _name: name,
      _symbol: ticker,
      _supply: INITIAL_SUPPLY,
      _initialTick: tick,
      _fee: fee,
      _salt: salt,
      _deployer: account,
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

  private getUniswapContract(coin: HydratedCoin): EthAddress {
    switch (coin.dexKind) {
      case 'univ2':
        return UNISWAP_V2_ROUTER_PROXY
      case 'univ3':
      case 'univ3-bonding':
        return UNISWAP_V3_ROUTER
    }
  }
}

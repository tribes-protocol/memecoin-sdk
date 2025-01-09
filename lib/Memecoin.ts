import {
  MEMECOIN_V5_LAUNCH_ABI,
  MEMECOIN_V5_PREDICT_TOKEN_ABI,
  TOKEN_GRADUATED_EVENT_ABI,
  TOKEN_MARKET_ADDRESS_ABI
} from '@/abi'
import { MemecoinAPI } from '@/api'
import {
  API_BASE_URL,
  INITIAL_SUPPLY,
  MEMECOIN_V5_LAUNCHER,
  TOKEN_GRADUATED_HASH
} from '@/constants'
import { isBatchSupported, isNull, retry } from '@/functions'
import { TokenSwapper } from '@/swapper'
import {
  DexMetadata,
  EstimateLaunchParams,
  EstimateLaunchResponse,
  EstimateSwapParams,
  EthAddress,
  EthAddressSchema,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  LaunchCoinResponse,
  LaunchResultSchema,
  MemecoinSDKConfig,
  PredictTokenParams,
  PredictTokenResponse,
  PredictTokenResultSchema,
  SwapEstimation,
  SwapParams,
  TokenGraduatedEventArgsSchema
} from '@/types'
import { UniswapV2 } from '@/uniswapv2'
import { UniswapV3 } from '@/uniswapv3'
import { getWalletClient } from '@/walletclient'
import {
  Chain,
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  http,
  parseEther,
  PublicClient,
  WalletCapabilities,
  WalletCapabilitiesRecord,
  WalletClient
} from 'viem'
import { base } from 'viem/chains'
import { getCapabilities } from 'viem/experimental'

export class MemecoinSDK {
  private readonly config: MemecoinSDKConfig
  private readonly rpcUrl: string
  private readonly apiBaseUrl: string
  private readonly api: MemecoinAPI
  private readonly uniswapV2: UniswapV2
  private readonly uniswapV3: UniswapV3
  private readonly tokenSwapper: TokenSwapper

  private get walletClient(): WalletClient {
    return getWalletClient(this.config)
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

    this.uniswapV2 = new UniswapV2(this.publicClient)
    this.uniswapV3 = new UniswapV3(this.publicClient)

    this.tokenSwapper = new TokenSwapper(
      this.publicClient,
      this.config,
      this.uniswapV3,
      this.uniswapV2,
      this.api
    )
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

  async estimateSwap(params: EstimateSwapParams): Promise<SwapEstimation> {
    return this.tokenSwapper.estimateSwap(params)
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

    const { antiSnipeAmount, marketCap, name, ticker, creator, salt, ethToRaise, token } =
      launchParams

    let dexMetadata: DexMetadata | undefined
    const account = walletClient.account
    if (isNull(account)) {
      throw new Error('No account found')
    }

    const launchData = encodeFunctionData({
      abi: MEMECOIN_V5_LAUNCH_ABI,
      functionName: 'launch',
      args: [creator ?? account.address, name, ticker, ethToRaise, salt]
    })

    const launchTx = {
      to: MEMECOIN_V5_LAUNCHER,
      data: launchData,
      value: antiSnipeAmount + parseEther('0.00001'),
      account,
      chain: base
    }

    const txHash = await walletClient.sendTransaction(launchTx)

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 2
    })
    const blockNumber = receipt.blockNumber
    const isDirectLaunch = marketCap === 0

    if (isDirectLaunch) {
      // direct launch
      const graduatedLog = receipt.logs.find((log) => log.topics[0] === TOKEN_GRADUATED_HASH)
      if (isNull(graduatedLog)) {
        throw new Error('Failed to find token graduated event log')
      }

      const { data, topics } = graduatedLog

      const parsedLog = decodeEventLog({
        abi: TOKEN_GRADUATED_EVENT_ABI,
        data,
        topics
      })

      const args = TokenGraduatedEventArgsSchema.parse(parsedLog.args)

      dexMetadata = {
        wethNFTId: args.wethTokenId.toString(),
        memeNFTId: args.memeTokenId.toString()
      }
    } else {
      // market launch
      const result = await retry(() =>
        this.publicClient.readContract({
          address: token,
          abi: TOKEN_MARKET_ADDRESS_ABI,
          functionName: 'marketAddress'
        })
      )

      const marketAddress = EthAddressSchema.parse(result)

      dexMetadata = {
        marketAddress
      }
    }

    await this.api.launchCoin(
      {
        ...launchParams,
        dexMetadata: dexMetadata ? JSON.stringify(dexMetadata) : null,
        dexInitiated: isDirectLaunch,
        dexInitiatedBlock: isDirectLaunch ? blockNumber : null,
        censored: false,
        contractAddress: token,
        creator: account.address,
        chainId: base.id,
        totalSupply: INITIAL_SUPPLY,
        dexKind: 'memecoinv5'
      },
      txHash
    )

    return {
      contractAddress: token,
      txHash
    }
  }

  private async getEthToRaise(marketCap: number): Promise<bigint> {
    const ethPrice = await this.uniswapV3.fetchEthereumPrice()
    const eth = (marketCap / (5 * ethPrice.price.toNumber())) * 1.03
    return parseEther(eth.toString())
  }

  private async predictToken(params: PredictTokenParams): Promise<PredictTokenResponse> {
    const { account, name, symbol, seed } = params

    const result = await retry(() =>
      this.publicClient.readContract({
        address: MEMECOIN_V5_LAUNCHER,
        abi: MEMECOIN_V5_PREDICT_TOKEN_ABI,
        functionName: 'predictToken',
        args: [account, name, symbol, seed]
      })
    )

    const parsedResult = PredictTokenResultSchema.parse(result)

    return {
      salt: parsedResult[0],
      token: parsedResult[1]
    }
  }

  async estimateLaunch(params: EstimateLaunchParams): Promise<EstimateLaunchResponse> {
    const { name, ticker, antiSnipeAmount, account, marketCap } = params

    const ethToRaise = marketCap > 0 ? await this.getEthToRaise(marketCap) : 0n

    const { salt, token } = await this.predictToken({
      name,
      symbol: ticker,
      account,
      seed: Date.now().toString()
    })

    const launchTx = {
      address: MEMECOIN_V5_LAUNCHER,
      abi: MEMECOIN_V5_LAUNCH_ABI,
      functionName: 'launch',
      args: [account, name, ticker, ethToRaise, salt],
      value: antiSnipeAmount + parseEther('0.00001'),
      account
    }
    const { result } = await this.publicClient.simulateContract(launchTx)
    const [, , , amountSwapped] = LaunchResultSchema.parse(result)

    return {
      salt,
      token,
      amountOut: amountSwapped,
      ethToRaise
    }
  }
}

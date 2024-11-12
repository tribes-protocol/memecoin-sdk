import { MemecoinSDK } from '@/Memecoin'
import { EthAddressSchema, HexStringSchema } from '@/types'
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'

describe('Memecoin', () => {
  const TGOAT = EthAddressSchema.parse('0x0b6739e7cb1a7f71a38d7a0c888ec60fcc50faec')
  const COINING = EthAddressSchema.parse('0x46aba6171054b5ce1c73675ed72b2c876724d3b3')
  const MEME = EthAddressSchema.parse('0xb928e5905872bda993a4ac054e1d129e658fadbd')
  const READY = EthAddressSchema.parse('0x7690399f0a587fec274312b06805b55d88940958')

  const RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/demo'
  const PRIVATE_KEY = HexStringSchema.parse('')

  const walletClient = createWalletClient({
    account: privateKeyToAccount(PRIVATE_KEY),
    transport: http(RPC_URL)
  })

  const sdk = new MemecoinSDK({
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    apiBaseUrl: 'http://localhost:3000'
  })

  it('should get a coin by id', async () => {
    const coin = await sdk.getCoin(1)

    expect(coin).toBeDefined()
    expect(coin.name).toBe('Memecoin.new')
    expect(coin.ticker).toBe('MEME')
    expect(coin.marketCap).toBeDefined()
  })

  it('should get trending coins', async () => {
    const coins = await sdk.getTrending()

    expect(coins.length).toBe(12)
  })

  it('should estimate buy using eth', async () => {
    const amountOut = await sdk.estimateBuy({
      coin: TGOAT,
      using: 'eth',
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should estimate sell using eth', async () => {
    const amountOut = await sdk.estimateSell({
      coin: TGOAT,
      using: 'eth',
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should buy from memepool', async () => {
    const amountIn = parseEther('0.0001')

    await sdk.buy({
      coin: TGOAT,
      using: 'eth',
      amountIn
    })
  })

  it('should sell to memepool', async () => {
    const amountIn = parseEther('1')

    await sdk.sell({
      coin: TGOAT,
      using: 'eth',
      amountIn
    })
  })

  it('should buy from uniswap', async () => {
    const amountIn = parseEther('0.0001')

    await sdk.buy({
      coin: MEME,
      using: 'eth',
      amountIn
    })
  })

  it('should sell to uniswap', async () => {
    const amountIn = parseEther('1')

    await sdk.sell({
      coin: MEME,
      using: 'eth',
      amountIn
    })
  })

  it('swap memepool to memepool', async () => {
    const fromToken = await sdk.getCoin(TGOAT)
    const toToken = await sdk.getCoin(COINING)

    const amountIn = parseEther('100')

    const amountOut = await sdk.estimateSwap({
      fromToken,
      toToken,
      amountIn
    })

    const address = walletClient.account.address

    const allowance = await sdk.getERC20Allowance(
      fromToken.contractAddress,
      fromToken.memePool,
      address
    )

    await sdk.swap({
      fromToken,
      toToken,
      amountIn,
      amountOut,
      allowance
    })
  })

  it('swap memepool to uniswap', async () => {
    const fromToken = await sdk.getCoin(COINING)
    const toToken = await sdk.getCoin(MEME)

    const amountIn = parseEther('1000')

    const amountOut = await sdk.estimateSwap({
      fromToken,
      toToken,
      amountIn
    })

    const address = walletClient.account.address

    const allowance = await sdk.getERC20Allowance(
      fromToken.contractAddress,
      fromToken.memePool,
      address
    )

    await sdk.swap({
      fromToken,
      toToken,
      amountIn,
      amountOut,
      allowance
    })
  })

  it('swap uniswap to memepool', async () => {
    const fromToken = await sdk.getCoin(MEME)
    const toToken = await sdk.getCoin(COINING)

    const amountIn = parseEther('1')

    const amountOut = await sdk.estimateSwap({
      fromToken,
      toToken,
      amountIn
    })

    const address = walletClient.account.address

    const allowance = await sdk.getERC20Allowance(
      fromToken.contractAddress,
      fromToken.memePool,
      address
    )

    await sdk.swap({
      fromToken,
      toToken,
      amountIn,
      amountOut,
      allowance
    })
  })

  it('swap uniswap to uniswap', async () => {
    const fromToken = await sdk.getCoin(MEME)
    const toToken = await sdk.getCoin(READY)

    const amountIn = parseEther('1')

    const amountOut = await sdk.estimateSwap({
      fromToken,
      toToken,
      amountIn
    })

    const address = walletClient.account.address

    const allowance = await sdk.getERC20Allowance(
      fromToken.contractAddress,
      fromToken.memePool,
      address
    )

    await sdk.swap({
      fromToken,
      toToken,
      amountIn,
      amountOut,
      allowance
    })
  })
})

import { MemecoinSDK } from '@/Memecoin'
import { EthAddressSchema, HexStringSchema } from '@/types'
import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

describe('Memecoin', () => {
  const TGOAT = EthAddressSchema.parse('0x0b6739e7cb1a7f71a38d7a0c888ec60fcc50faec')
  const COINING = EthAddressSchema.parse('0x46aba6171054b5ce1c73675ed72b2c876724d3b3')
  const MEME = EthAddressSchema.parse('0xb928e5905872bda993a4ac054e1d129e658fadbd')
  const READY = EthAddressSchema.parse('0x7690399f0a587fec274312b06805b55d88940958')

  const RPC_URL = 'https://base-mainnet.g.alchemy.com/v2/demo'
  const PRIVATE_KEY = HexStringSchema.parse('')

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
    const amountOut = await sdk.estimateSwap({
      fromToken: 'eth',
      toToken: TGOAT,
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should estimate sell using eth', async () => {
    const amountOut = await sdk.estimateSwap({
      fromToken: 'eth',
      toToken: TGOAT,
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should buy from memepool', async () => {
    const amountIn = parseEther('0.0001')

    await sdk.swap({
      fromToken: 'eth',
      toToken: TGOAT,
      amountIn
    })
  })

  it('should sell to memepool', async () => {
    const amountIn = parseEther('1')

    await sdk.swap({
      fromToken: TGOAT,
      toToken: 'eth',
      amountIn
    })
  })

  it('should buy from uniswap', async () => {
    const amountIn = parseEther('0.0001')

    await sdk.swap({
      fromToken: 'eth',
      toToken: MEME,
      amountIn
    })
  })

  it('should sell to uniswap', async () => {
    const amountIn = parseEther('1')

    await sdk.swap({
      fromToken: MEME,
      toToken: 'eth',
      amountIn
    })
  })

  it('swap memepool to memepool', async () => {
    const amountIn = parseEther('100')

    await sdk.swap({
      fromToken: TGOAT,
      toToken: COINING,
      amountIn
    })
  })

  it('swap memepool to uniswap', async () => {
    const amountIn = parseEther('100')

    await sdk.swap({
      fromToken: COINING,
      toToken: MEME,
      amountIn
    })
  })

  it('swap uniswap to memepool', async () => {
    const amountIn = parseEther('1')

    await sdk.swap({
      fromToken: MEME,
      toToken: COINING,
      amountIn
    })
  })

  it('swap uniswap to uniswap', async () => {
    const amountIn = parseEther('1')

    await sdk.swap({
      fromToken: MEME,
      toToken: READY,
      amountIn
    })
  })
})

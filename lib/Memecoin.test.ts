import { MemecoinSDK } from '@/Memecoin'
import { EthAddressSchema, HexStringSchema } from '@/types'
import { parseEther } from 'viem'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Memecoin', () => {
  let sdk: MemecoinSDK
  const TGOAT = EthAddressSchema.parse('0x0b6739e7cb1a7f71a38d7a0c888ec60fcc50faec')
  const MEME = EthAddressSchema.parse('0xb928e5905872bda993a4ac054e1d129e658fadbd')

  beforeEach(async () => {
    sdk = new MemecoinSDK({
      privateKey: HexStringSchema.parse(''),
      rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/demo'
    })
  })

  it.skip('should get a coin by id', async () => {
    const coin = await sdk.getCoin(1)

    expect(coin).toBeDefined()
    expect(coin.name).toBe('Memecoin.new')
    expect(coin.ticker).toBe('MEME')
    expect(coin.marketCap).toBeDefined()
  })

  it.skip('should get trending coins', async () => {
    const coins = await sdk.getTrending()

    expect(coins.length).toBe(12)
  })

  it('should estimate buy using eth', async () => {
    const coin = await sdk.getCoin(TGOAT)

    const amountOut = await sdk.estimateBuy({
      coin,
      using: 'eth',
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should estimate sell using eth', async () => {
    const coin = await sdk.getCoin(TGOAT)

    const amountOut = await sdk.estimateSell({
      coin,
      using: 'eth',
      amountIn: BigInt(10000000000000000)
    })

    expect(amountOut).toBeDefined()
  })

  it('should buy from memepool', async () => {
    const amountIn = parseEther('0.0001')

    const coin = await sdk.getCoin(TGOAT)

    const amountOut = await sdk.estimateBuy({
      coin,
      using: 'eth',
      amountIn
    })

    await sdk.buy({
      coin,
      using: 'eth',
      amountIn,
      amountOut
    })
  })

  it('should sell to memepool', async () => {
    const amountIn = parseEther('1')

    const coin = await sdk.getCoin(TGOAT)

    const amountOut = await sdk.estimateSell({
      coin,
      using: 'eth',
      amountIn
    })

    const allowance = await sdk.getERC20Allowance(coin.contractAddress, coin.memePool)

    await sdk.sell({
      coin,
      using: 'eth',
      amountIn,
      amountOut,
      allowance
    })
  })

  it('should buy from uniswap', async () => {
    const amountIn = parseEther('0.0001')

    const coin = await sdk.getCoin(MEME)

    const amountOut = await sdk.estimateBuy({
      coin,
      using: 'eth',
      amountIn
    })

    const pair = await sdk.getPair(coin)

    await sdk.buy({
      coin,
      using: 'eth',
      amountIn,
      amountOut,
      pair
    })
  })

  it('should sell to uniswap', async () => {
    const amountIn = parseEther('1')

    const coin = await sdk.getCoin(MEME)

    const amountOut = await sdk.estimateSell({
      coin,
      using: 'eth',
      amountIn
    })

    const pair = await sdk.getPair(coin)

    const allowance = await sdk.getERC20Allowance(coin.contractAddress, coin.memePool)

    await sdk.sell({
      coin,
      using: 'eth',
      amountIn,
      amountOut,
      allowance,
      pair
    })
  })
})

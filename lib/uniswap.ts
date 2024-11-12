import { isNull } from '@/functions'
import { EthAddress, EthAddressSchema } from '@/types'
import { ChainId, CurrencyAmount, Token, WETH9 } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { PublicClient } from 'viem'

export async function getUniswapPair(coin: EthAddress, publicClient?: PublicClient): Promise<Pair> {
  const token = new Token(ChainId.BASE, coin, 18)
  const weth = WETH9[ChainId.BASE]
  if (isNull(weth)) {
    throw new Error('WETH9 is not supported on this chain')
  }

  if (isNull(publicClient)) {
    throw new Error('Public client is required')
  }

  const pairAddress = Pair.getAddress(token, weth)
  const reserves = await publicClient.readContract({
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

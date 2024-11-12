import { EthAddress, EthAddressSchema, OnchainData } from '@/types'
import { ChainId, CurrencyAmount, Token, WETH9 } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import { PublicClient } from 'viem'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureString(value: any, message: string | undefined = undefined): string {
  if (!value) {
    throw new Error(message || 'Value is undefined')
  }
  return value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNull(obj: any): obj is null | undefined {
  return obj === null || obj === undefined
}

export function compactMap<T>(array: (T | null | undefined)[]): T[] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return array.filter((item) => !isNull(item)) as T[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequiredString(arg: any): arg is string {
  return typeof arg === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOptionalString(arg: any): arg is string | null | undefined {
  return isNull(arg) || isRequiredString(arg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequiredNumber(arg: any): arg is number {
  return typeof arg === 'number'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOptionalNumber(arg: any): arg is number | null | undefined {
  return isNull(arg) || isRequiredNumber(arg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBigInt(value: any): value is bigint {
  return typeof value === 'bigint'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidBigIntString(str: any): boolean {
  try {
    if (!isRequiredString(str)) {
      return false
    }
    BigInt(str)
    return true
  } catch (e) {
    return false
  }
}

export function encodeOnchainData(data: OnchainData): string {
  const separator = '@@@'
  return [
    data.image,
    data.website,
    data.twitter,
    data.telegram,
    data.discord,
    data.description
  ].join(separator)
}

export async function getPair(coin: EthAddress, publicClient?: PublicClient): Promise<Pair> {
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

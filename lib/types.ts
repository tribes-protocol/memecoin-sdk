import { isRequiredString } from '@/functions'
import { Pair } from '@uniswap/v2-sdk'
import { isAddress, WalletClient } from 'viem'
import { z } from 'zod'

export const EthAddressSchema = z
  .custom<`0x${string}`>((val): val is `0x${string}` => typeof val === 'string' && isAddress(val))
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  .transform((arg) => arg.toLowerCase() as `0x${string}`)

export type EthAddress = z.infer<typeof EthAddressSchema>

export const HexStringSchema = z
  .custom<`0x${string}`>((val): val is `0x${string}` => {
    if (typeof val !== 'string') return false
    const normalized = val.startsWith('0x') ? val : `0x${val}`
    return /^0x[a-fA-F0-9]+$/.test(normalized)
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  .transform((val) => (val.startsWith('0x') ? val : (`0x${val}` as `0x${string}`)))

export type HexString = z.infer<typeof HexStringSchema>

type BaseMemecoinSDKConfig = {
  rpcUrl: string
  apiBaseUrl?: string
}

export type MemecoinSDKConfig =
  | (BaseMemecoinSDKConfig & {
      walletClient?: WalletClient
    })
  | (BaseMemecoinSDKConfig & {
      privateKey?: HexString
    })

export interface BaseLaunchCoinParams {
  name: string
  ticker: string
  antiSnipeAmount: bigint
  image: string
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
  description?: string
  lockingDays?: number
  farcasterId?: number
  farcaster?: string
}

export type LaunchCoinBondingCurveParams = BaseLaunchCoinParams & {
  kind: 'bonding-curve'
}

export type LaunchCoinDirectParams = BaseLaunchCoinParams & {
  kind: 'direct'
  tick: number
  salt: HexString
  fee: number
}

export type EstimateLaunchBuyParams = LaunchCoinDirectParams & { account: EthAddress }

export type LaunchCoinParams = LaunchCoinBondingCurveParams | LaunchCoinDirectParams

export interface LaunchCoinResponse {
  contractAddress: EthAddress
  txHash: HexString
}

export type ABI = {
  type: string
  name: string
  inputs: {
    type: string
    name: string
    indexed?: boolean
  }[]
}[]

export const OnchainDataSchema = z.object({
  image: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  farcaster: z.string().optional(),
  description: z.string().optional(),
  farcasterId: z.number().optional()
})

export type OnchainData = z.infer<typeof OnchainDataSchema>

export const CoinSchema = z.object({
  id: z.number(),
  createdAt: z.preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date()),
  contractAddress: EthAddressSchema,
  dexInitiated: z.boolean().nullable(),
  dexInitiatedBlock: z
    .string()
    .transform((arg) => BigInt(arg))
    .nullable(),
  creator: EthAddressSchema,
  memeDeployer: EthAddressSchema.nullable(),
  memePool: EthAddressSchema.nullable(),
  memeEventTracker: EthAddressSchema.nullable(),
  rewardsPool: EthAddressSchema.nullable(),
  memeStorage: EthAddressSchema.nullable(),
  totalSupply: z.string().transform((arg) => BigInt(arg)),
  marketCap: z.string().transform((value) => BigInt(value)),
  name: z.string(),
  ticker: z.string(),
  description: z.string(),
  dexKind: z.enum(['univ2', 'univ3']),
  dexMetadata: z.string().nullable()
})

export type Coin = z.infer<typeof CoinSchema>

export const UserSchema = z.object({
  id: z.number(),
  address: EthAddressSchema,
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable()
})

export type User = z.infer<typeof UserSchema>

export const HolderSchema = z.object({
  accountAddress: EthAddressSchema,
  coinId: z.number(),
  balance: z.string().transform((arg) => BigInt(arg)),
  lockedDays: z.number().optional().nullable(),
  lockStartDate: z
    .preprocess((arg) => (typeof arg === 'string' ? new Date(arg) : arg), z.date())
    .optional()
    .nullable()
})

export type Holder = z.infer<typeof HolderSchema>

export const HydratedCoinSchema = CoinSchema.extend({
  marketCap: z.string().transform((value) => BigInt(value)),
  user: UserSchema.optional().nullable(),
  holder: HolderSchema.optional().nullable()
})

export type HydratedCoin = z.infer<typeof HydratedCoinSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isHydratedCoinOrEth(coin: any): coin is HydratedCoin | 'eth' {
  if (coin === 'eth') return true
  return HydratedCoinSchema.safeParse(coin).success
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEthAddressOrEth(coin: any): coin is EthAddress | 'eth' {
  if (coin === 'eth') return true
  return EthAddressSchema.safeParse(coin).success
}

export interface BaseSellParams {
  using: 'eth'
  amountIn: bigint
  slippage?: number
  affiliate?: EthAddress
}

export interface SellFrontendParams extends BaseSellParams {
  coin: HydratedCoin
  amountOut: bigint
  allowance: bigint
  pair?: Pair
}

export interface SellBackendParams extends BaseSellParams {
  coin: EthAddress
}

export type TradeSellParams = SellFrontendParams | SellBackendParams

export function isSellFrontendParams(params: TradeSellParams): params is SellFrontendParams {
  return !isRequiredString(params.coin) && 'amountOut' in params
}

export interface BaseBuyParams {
  using: 'eth'
  amountIn: bigint
  slippage?: number
  affiliate?: EthAddress
  lockingDays?: number
}

export interface BuyFrontendParams extends BaseBuyParams {
  coin: HydratedCoin
  amountOut: bigint
  pair?: Pair
}

export interface BuyBackendParams extends BaseBuyParams {
  coin: EthAddress
}

export type TradeBuyParams = BuyFrontendParams | BuyBackendParams

export function isBuyFrontendParams(params: TradeBuyParams): params is BuyFrontendParams {
  return !isRequiredString(params.coin) && 'amountOut' in params
}

export interface BuyManyParams {
  memeCoins: (EthAddress | HydratedCoin)[]
  ethAmounts: bigint[]
  expectedTokensAmounts: bigint[]
  affiliate?: EthAddress
  lockingDays?: number
}

export function isBuyManyParams(params: BuyManyParams): params is BuyManyParams {
  return params.memeCoins.every((coin) => !isRequiredString(coin))
}

export interface EstimateTradeParams {
  coin: EthAddress
  using: 'eth'
  amountIn: bigint
}

export interface EstimateSwapCoinParams {
  fromToken: EthAddress
  toToken: EthAddress
  amountIn: bigint
}

export type EstimateSwapParams =
  | {
      fromToken: EthAddress
      toToken: EthAddress | 'eth'
      amountIn: bigint
    }
  | {
      fromToken: 'eth'
      toToken: EthAddress
      amountIn: bigint
    }

export type SwapFrontendParams =
  | {
      fromToken: HydratedCoin
      toToken: HydratedCoin | 'eth'
      amountIn: bigint
      amountOut: bigint
      allowance: bigint
      slippage?: number
      affiliate?: EthAddress
      pair?: Pair
    }
  | {
      fromToken: 'eth'
      toToken: HydratedCoin
      amountIn: bigint
      amountOut: bigint
      lockingDays?: number
      slippage?: number
      affiliate?: EthAddress
      pair?: Pair
    }

export type SwapBackendParams =
  | {
      fromToken: EthAddress
      toToken: EthAddress | 'eth'
      amountIn: bigint
      slippage?: number
      affiliate?: EthAddress
    }
  | {
      fromToken: 'eth'
      toToken: EthAddress
      amountIn: bigint
      lockingDays?: number
      slippage?: number
      affiliate?: EthAddress
    }

export type TradeSwapParams = SwapFrontendParams | SwapBackendParams

export function isSwapFrontendParams(params: TradeSwapParams): params is SwapFrontendParams {
  return (
    'amountOut' in params &&
    isHydratedCoinOrEth(params.fromToken) &&
    isHydratedCoinOrEth(params.toToken)
  )
}

export const GenerateSaltResultSchema = z.object({
  salt: HexStringSchema,
  token: EthAddressSchema
})

export type GenerateSaltParams = {
  name: string
  symbol: string
  supply: bigint
  account: EthAddress
} & OnchainData

export const LaunchResultSchema = z.tuple([EthAddressSchema, z.bigint(), z.bigint()])

export type MarketCapToTickParams = {
  marketCap: number
  totalSupply: bigint
  fee: 10000 | 3000 | 500 | 100
}

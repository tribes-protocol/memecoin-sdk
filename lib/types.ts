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

export interface LaunchCoinParams {
  name: string
  ticker: string
  antiSnipeAmount: bigint
  image: string
  website: string
  twitter: string
  telegram: string
  discord: string
  description: string
  lockingDays?: number
}

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
  description: z.string().optional()
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
  memeDeployer: EthAddressSchema,
  memePool: EthAddressSchema,
  memeEventTracker: EthAddressSchema,
  rewardsPool: EthAddressSchema,
  memeStorage: EthAddressSchema,
  totalSupply: z.string().transform((arg) => BigInt(arg)),
  marketCap: z.string().transform((value) => BigInt(value)),
  name: z.string(),
  ticker: z.string(),
  description: z.string()
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

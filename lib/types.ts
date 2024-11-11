import { Pair } from '@uniswap/v2-sdk'
import { isAddress, WalletCapabilities, WalletCapabilitiesRecord, WalletClient } from 'viem'
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

export interface MemecoinSDKConfig {
  rpcUrl: string
  apiBaseUrl?: string
  walletClient?: WalletClient
  capabilities?: WalletCapabilitiesRecord<WalletCapabilities, number>
}

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

export const BasicMemecoinSchema = z.object({
  name: z.string(),
  ticker: z.string(),
  description: z.string()
})

export const FalGenImageStatusRequestSchema = z.object({
  requestId: z.string(),
  model: z.string()
})

export const GenerateMemecoinFromPhraseResponseSchema = z.object({
  prompt: z.string(),
  memecoin: BasicMemecoinSchema,
  requests: z.array(FalGenImageStatusRequestSchema)
})

export type GenerateMemecoinFromPhraseResponse = z.infer<
  typeof GenerateMemecoinFromPhraseResponseSchema
>

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

export interface TradeSellParams {
  coin: HydratedCoin
  using: 'eth'
  amountIn: bigint
  amountOut: bigint
  allowance: bigint
  slippage?: number
  affiliate?: EthAddress
  pair?: Pair
  lockingDays?: number
}

export type TradeBuyParams = Omit<TradeSellParams, 'allowance'>

export interface BuyManyParams {
  memeCoins: HydratedCoin[]
  ethAmounts: bigint[]
  expectedTokensAmounts: bigint[]
  affiliate?: EthAddress
  lockingDays?: number
}

export interface EstimateTradeParams {
  coin: HydratedCoin
  using: 'eth'
  amountIn: bigint
}

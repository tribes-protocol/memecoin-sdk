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
  lockingDays?: number
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

export const DexMetadataUniv3Schema = z.object({
  lpNftId: z.string(),
  lockerAddress: EthAddressSchema
})

export type DexMetadata = z.infer<typeof DexMetadataUniv3Schema>

export interface LaunchCoinResponse {
  contractAddress: EthAddress
  txHash: HexString
  dexMetadata?: DexMetadata
}

export const TokenCreatedEventArgsSchema = z.object({
  tokenAddress: EthAddressSchema,
  lpNftId: z.bigint(),
  deployer: EthAddressSchema,
  name: z.string(),
  symbol: z.string(),
  supply: z.bigint(),
  _supply: z.bigint(),
  lockerAddress: EthAddressSchema,
  data: z.string()
})

export type TokenCreatedEventArgs = z.infer<typeof TokenCreatedEventArgsSchema>

export const BondingCurveTokenCreatedEventArgsSchema = z.object({
  factoryAddress: EthAddressSchema,
  tokenCreator: EthAddressSchema,
  protocolFeeRecipient: EthAddressSchema,
  bondingCurve: EthAddressSchema,
  tokenURI: z.string(),
  name: z.string(),
  symbol: z.string(),
  tokenAddress: EthAddressSchema,
  poolAddress: EthAddressSchema
})

export type ABI = {
  type: string
  name: string
  inputs: {
    type: string
    name: string
    indexed?: boolean
  }[]
}[]

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
  dexKind: z.enum(['univ2', 'univ3', 'univ3-bonding']),
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

export enum TokenPoolType {
  BondingCurve = 0,
  UniswapV3 = 1,
  UniswapV2 = 2,
  WETH = 3
}

export interface SwapParams {
  tokenIn: EthAddress
  tokenOut: EthAddress
  tokenInPoolType: TokenPoolType
  tokenOutPoolType: TokenPoolType
  amountIn: bigint
  amountOutMinimum: bigint
  recipient?: EthAddress
  orderReferrer?: EthAddress
  feeIn?: number
  feeOut?: number
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
}

export type PredictTokenParams = GenerateSaltParams & {
  salt: HexString
}

export const LaunchResultSchema = z.tuple([EthAddressSchema, z.bigint(), z.bigint()])

export type MarketCapToTickParams = {
  marketCap: number
  totalSupply: bigint
  fee: 10000 | 3000 | 500 | 100
}

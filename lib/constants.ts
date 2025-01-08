import {
  BUY_MANY_TOKENS_ABI_V2,
  BUY_TOKENS_ABI_V2,
  CREATE_MEME_ABI_V2,
  SELL_TOKENS_ABI_V2,
  SWAP_MEMECOIN_ABI
} from '@/abi'
import { ABI, EthAddress, EthAddressSchema, HexStringSchema } from '@/types'
import { parseUnits } from 'viem'
import { z } from 'zod'

export const API_BASE_URL = 'https://memecoin.new'

export const INITIAL_SUPPLY = parseUnits('1000000000', 18)
export const INITIAL_RESERVE = parseUnits('0.0001', 18)

export const WETH_TOKEN = EthAddressSchema.parse('0x4200000000000000000000000000000000000006') // BASE MAINNET WETH

export const ZERO_ADDRESS = EthAddressSchema.parse('0x0000000000000000000000000000000000000000')

export const UNISWAP_V2_FACTORY = EthAddressSchema.parse(
  '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6'
) // BASE MAINNET UNISWAP V2 FACTORY

export const UNISWAP_V2_ROUTER = EthAddressSchema.parse(
  '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'
) // BASE MAINNET UNISWAP V2 ROUTER

export const UNISWAP_V3_FACTORY = EthAddressSchema.parse(
  '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
) // BASE MAINNET UNISWAP V3 FACTORY

export const UNISWAP_V3_LAUNCHER = EthAddressSchema.parse(
  '0x488f89cD18aED32bB83c3e3BA8445939cA7499CC'
)

export const UNISWAP_V3_ROUTER = EthAddressSchema.parse(
  '0x2626664c2603336E57B271c5C0b26F421741e481'
) // BASE MAINNET UNISWAP V3 ROUTER

export interface MemeContracts {
  DEPLOYER: EthAddress
  POOL: EthAddress
  FEE_COLLECTOR: EthAddress
  MEME_SWAP: EthAddress
  CREATE_MEME_ABI: ABI
  BUY_TOKENS_ABI: ABI
  SELL_TOKENS_ABI: ABI
  BUY_MANY_TOKENS_ABI: ABI
  SWAP_ABI: ABI
}

export const MEME_V3: MemeContracts = {
  DEPLOYER: EthAddressSchema.parse('0x4Cc5332C8Cee730B2fb72E53E060B440359218F9'),
  POOL: EthAddressSchema.parse('0x413371f1D40b32674953a7DC18885D3ece98ed63'),
  FEE_COLLECTOR: EthAddressSchema.parse('0x74b2a494B547bFa9c2a3Dfd5ff095Cb81830a1d2'),
  MEME_SWAP: EthAddressSchema.parse('0x09ebEa36D1b2dF059648f525230f2E7331106CB7'),
  CREATE_MEME_ABI: CREATE_MEME_ABI_V2,
  BUY_TOKENS_ABI: BUY_TOKENS_ABI_V2,
  SELL_TOKENS_ABI: SELL_TOKENS_ABI_V2,
  BUY_MANY_TOKENS_ABI: BUY_MANY_TOKENS_ABI_V2,
  SWAP_ABI: SWAP_MEMECOIN_ABI
}

export const CURRENT_MEME_INFO = MEME_V3

const ALL_VERSIONS = [MEME_V3]

export const BONDING_CURVE_TOKEN_DEPLOYER = EthAddressSchema.parse(
  '0x0e9C4E84b3ae76DA8F0ec838F0AE4f9577d7b086'
)

export const MULTISIG_FEE_COLLECTOR = EthAddressSchema.parse(
  '0x9A142B38d483d150dB2c115b4efA5ca37aC57Ebc'
)

export const WETH_ADDRESS = EthAddressSchema.parse('0x4200000000000000000000000000000000000006')

function findMemeVersionByMemePool(memePool: EthAddress): MemeContracts {
  for (const version of ALL_VERSIONS) {
    if (memePool === version.POOL) {
      return version
    }
  }

  throw new Error(`Invalid meme pool: ${memePool}`)
}

function findMemeVersionByMemeDeployer(memeDeployer: EthAddress): MemeContracts {
  for (const version of ALL_VERSIONS) {
    if (memeDeployer === version.DEPLOYER) {
      return version
    }
  }

  throw new Error(`Invalid meme deployer: ${memeDeployer}`)
}

export function getBuyManyTokensABI(memePool: EthAddress): ABI {
  return findMemeVersionByMemePool(memePool).BUY_MANY_TOKENS_ABI
}

export function getBuyTokensABI(memePool: EthAddress): ABI {
  return findMemeVersionByMemePool(memePool).BUY_TOKENS_ABI
}

export function getSellTokensABI(memePool: EthAddress): ABI {
  return findMemeVersionByMemePool(memePool).SELL_TOKENS_ABI
}

export function getCreateMemeABI(memeDeployer: EthAddress): ABI {
  return findMemeVersionByMemeDeployer(memeDeployer).CREATE_MEME_ABI
}

export const BASE_CHAIN_ID = 8453

export const MEME_TOKEN = EthAddressSchema.parse('0xb928e5905872bda993a4ac054e1d129e658fadbd')

export const WETH_USDC_POOL_ADDRESS = EthAddressSchema.parse(
  '0xd0b53D9277642d899DF5C87A3966A349A798F224'
) // BASE MAINNET WETH/USDC V3
export const USDC_DECIMALS = 6
export const WETH_DECIMALS = 18

export const UNISWAP_V2_ROUTER_PROXY = EthAddressSchema.parse(
  '0xa9BDdCB6dD4d3657532F346016F0220c0BabEf8E'
)

export const CapabilitiesSchema = z.object({
  [BASE_CHAIN_ID]: z.object({
    atomicBatch: z.object({
      supported: z.boolean()
    })
  })
})

export const LN_1_0001 = Math.log(1.0001)

export const UNISWAP_FEE_TIERS = [500, 3000, 10000]

export const MEMECOIN_V5_LAUNCHER = EthAddressSchema.parse(
  '0x25a28CC1dC19878932dF67f58e3f4FBe493f33f2'
)

export const TOKEN_SWAPPER_ADDRESS = EthAddressSchema.parse(
  '0x825520c1C3f79D3C195AF88f062b050C63C74cB8'
)

export const TOKEN_GRADUATED_HASH = HexStringSchema.parse(
  '0x1669614928af055cd5932e43424383a863eb888f3e3a9f80f443162171c568b6'
)

export const SWAPPER_CONTRACT = EthAddressSchema.parse('0x825520c1C3f79D3C195AF88f062b050C63C74cB8')

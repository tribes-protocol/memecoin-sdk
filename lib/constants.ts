import { parseUnits, WalletCapabilities } from 'viem'
import {
  ABI,
  EthAddress,
  HexString,
  OnchainDataSchema,
  OnchainData,
  EthAddressSchema
} from '@/types'
import {
  REWARD_RECIPIENTS_ABI_V1,
  BUY_MANY_TOKENS_ABI_V1,
  BUY_TOKENS_ABI_V1,
  CREATE_MEME_ABI_V1,
  SELL_TOKENS_ABI_V1,
  TRADECALL_EVENT_ABI_V1,
  TRADECALL_EVENT_ABI_V2,
  CREATE_MEME_ABI_V2,
  BUY_TOKENS_ABI_V2,
  SELL_TOKENS_ABI_V2,
  BUY_MANY_TOKENS_ABI_V2,
  REWARD_RECIPIENTS_ABI_V2
} from '@/abi'
import { z } from 'zod'

export const API_BASE_URL = 'https://memecoin.new'

export const INITIAL_SUPPLY = parseUnits('1000000000', 18)
export const INITIAL_RESERVE = parseUnits('0.0001', 18)

export const WETH_TOKEN = EthAddressSchema.parse('0x4200000000000000000000000000000000000006') // BASE MAINNET WETH
export const UNISWAP_V2_ROUTER = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24' // BASE MAINNET UNISWAP V2 ROUTER

export interface MemeContracts {
  DEPLOYER: EthAddress
  POOL: EthAddress
  EVENT_TRACKER: EthAddress
  REWARDS_POOL: EthAddress
  STORAGE: EthAddress
  FEE_COLLECTOR: EthAddress
  TRADECALL_EVENT_HASH: HexString
  TRADECALL_EVENT_ABI: ABI
  CREATE_MEME_ABI: ABI
  BUY_TOKENS_ABI: ABI
  SELL_TOKENS_ABI: ABI
  BUY_MANY_TOKENS_ABI: ABI
  REWARD_RECIPIENTS_ABI: ABI
}

export const MEME_V1: MemeContracts = {
  DEPLOYER: EthAddressSchema.parse('0x20065c66bEFbA4EFb99647b2DE8A024E393e0C71'),
  POOL: EthAddressSchema.parse('0x7A8719886C80107BCfe70e0dcf5C3FFb9670eF6B'),
  EVENT_TRACKER: EthAddressSchema.parse('0x9046e51628C713Cd4402A549957d9342b5e482ca'),
  REWARDS_POOL: EthAddressSchema.parse('0xE765D23A916A27589EF58015F9162945A0D66CE1'),
  STORAGE: EthAddressSchema.parse('0xeE39d658FfC85930f3d1Ca8fcd05fE22F82D8e51'),
  FEE_COLLECTOR: EthAddressSchema.parse('0xc648519ed04ea8b1193c37ed7e134d9253941dcb'),
  // events
  TRADECALL_EVENT_HASH: '0xb5176cfbd90a3d09b9f4bbf13df528e643ce5e55ab86f44dd3d1dd7b9a4acf73',
  // abis
  TRADECALL_EVENT_ABI: TRADECALL_EVENT_ABI_V1,
  CREATE_MEME_ABI: CREATE_MEME_ABI_V1,
  BUY_TOKENS_ABI: BUY_TOKENS_ABI_V1,
  SELL_TOKENS_ABI: SELL_TOKENS_ABI_V1,
  BUY_MANY_TOKENS_ABI: BUY_MANY_TOKENS_ABI_V1,
  REWARD_RECIPIENTS_ABI: REWARD_RECIPIENTS_ABI_V1
}

export const MEME_V2: MemeContracts = {
  DEPLOYER: EthAddressSchema.parse('0x9212e093897264f0A6F629190720Cd99992f5EB8'),
  POOL: EthAddressSchema.parse('0x35e17f94f164a696e345FDcd1C30a4aed2A726fb'),
  EVENT_TRACKER: EthAddressSchema.parse('0xF30b5092135eCDc0Dff1b55b436A31Cb67e7d1dA'),
  REWARDS_POOL: EthAddressSchema.parse('0xf51f535248728c1e7fD9681f71A694a9C5527A9A'),
  STORAGE: EthAddressSchema.parse('0xc11E198dE145bADB562368C297e31eaDA0290A34'),
  FEE_COLLECTOR: EthAddressSchema.parse('0x24E523b2071D5910D23a151F764F9c97632c27d1'),
  // events
  TRADECALL_EVENT_HASH: '0xb5176cfbd90a3d09b9f4bbf13df528e643ce5e55ab86f44dd3d1dd7b9a4acf73',
  // abis
  TRADECALL_EVENT_ABI: TRADECALL_EVENT_ABI_V2,
  CREATE_MEME_ABI: CREATE_MEME_ABI_V2,
  BUY_TOKENS_ABI: BUY_TOKENS_ABI_V2,
  SELL_TOKENS_ABI: SELL_TOKENS_ABI_V2,
  BUY_MANY_TOKENS_ABI: BUY_MANY_TOKENS_ABI_V2,
  REWARD_RECIPIENTS_ABI: REWARD_RECIPIENTS_ABI_V2
}

export const MEME_V3: MemeContracts = {
  DEPLOYER: EthAddressSchema.parse('0x4Cc5332C8Cee730B2fb72E53E060B440359218F9'),
  POOL: EthAddressSchema.parse('0x413371f1D40b32674953a7DC18885D3ece98ed63'),
  EVENT_TRACKER: EthAddressSchema.parse('0xbCf240900161F93e32510c4ec2a7aF3a34dD2F8E'),
  REWARDS_POOL: EthAddressSchema.parse('0x45817d8E6d4b36f55F9fb8533C969f52c26579C7'),
  STORAGE: EthAddressSchema.parse('0xa6Bb97E7fB6CB4b61321c09eC0D81098A6682c9a'),
  FEE_COLLECTOR: EthAddressSchema.parse('0x74b2a494B547bFa9c2a3Dfd5ff095Cb81830a1d2'),
  // events
  TRADECALL_EVENT_HASH: '0xb5176cfbd90a3d09b9f4bbf13df528e643ce5e55ab86f44dd3d1dd7b9a4acf73',
  // abis
  TRADECALL_EVENT_ABI: TRADECALL_EVENT_ABI_V2,
  CREATE_MEME_ABI: CREATE_MEME_ABI_V2,
  BUY_TOKENS_ABI: BUY_TOKENS_ABI_V2,
  SELL_TOKENS_ABI: SELL_TOKENS_ABI_V2,
  BUY_MANY_TOKENS_ABI: BUY_MANY_TOKENS_ABI_V2,
  REWARD_RECIPIENTS_ABI: REWARD_RECIPIENTS_ABI_V2
}

export const CURRENT_MEME_INFO = MEME_V3

const ALL_VERSIONS = [MEME_V1, MEME_V2, MEME_V3]

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

function findMemeVersionByRewardsPool(rewardsPool: EthAddress): MemeContracts {
  for (const version of ALL_VERSIONS) {
    if (rewardsPool === version.REWARDS_POOL) {
      return version
    }
  }

  throw new Error(`Invalid rewards pool: ${rewardsPool}`)
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

export function getTradeCallEventABI(memePool: EthAddress): ABI {
  return findMemeVersionByMemePool(memePool).TRADECALL_EVENT_ABI
}

export function getRewardRecipientsABI(rewardsPool: EthAddress): ABI {
  return findMemeVersionByRewardsPool(rewardsPool).REWARD_RECIPIENTS_ABI
}

export const BASE_CHAIN_ID = 8453

export const UNISWAP_FEE_COLLECTOR = EthAddressSchema.parse(
  '0x0Be926A9400F8bd064BfcfEc318219A812e37d57'
)

export const REWARDS_DISTRIBUTED_EVENT_HASH =
  '0x92d8e67e11e35152e7b525077fc4cf66393423d128ce3b803453b22533c57641'

export const LISTED_EVENT_HASH =
  '0x630616749c0aa3ac2b8943843261fd2d07d0045dde6fe2a8b25381b8e6dc0f27'

export const MEME_TOKEN = EthAddressSchema.parse('0xb928e5905872bda993a4ac054e1d129e658fadbd')

export const TRANSFER_EVENT_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
export const SWAP_EVENT_HASH = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'

export const WETH_USDC_POOL_ADDRESS = EthAddressSchema.parse(
  '0xd0b53D9277642d899DF5C87A3966A349A798F224'
) // BASE MAINNET WETH/USDC V3
export const USDC_DECIMALS = 6
export const WETH_DECIMALS = 18

export const MEME_CREATED_EVENT_HASH =
  '0x2f6ba3d09bcb36537efff15c408b8477e6c725dbc8134e54215e0af052cca2ff'

export const UNISWAP_V2_ROUTER_PROXY = EthAddressSchema.parse(
  '0xa9BDdCB6dD4d3657532F346016F0220c0BabEf8E'
)

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

export function decodeOnchainData(encodedData: string): OnchainData {
  const [image, website, twitter, telegram, discord, description] = encodedData.split('@@@')
  const parsedData = OnchainDataSchema.parse({
    image,
    website,
    twitter,
    telegram,
    discord,
    description
  })
  return parsedData
}

const CapabilitiesSchema = z.object({
  [BASE_CHAIN_ID]: z.object({
    atomicBatch: z.object({
      supported: z.boolean()
    })
  })
})

export function isBatchSupported(
  capabilities: { [x: number]: WalletCapabilities } | undefined
): boolean {
  try {
    const parsedCapabilities = CapabilitiesSchema.parse(capabilities)
    return parsedCapabilities[BASE_CHAIN_ID].atomicBatch.supported
  } catch {
    console.error('Failed to parse capabilities', capabilities)
    return false
  }
}

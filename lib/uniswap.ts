import { UNISWAP_V2_FACTORY_ABI, UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI } from '@/abi'
import {
  UNISWAP_V2_FACTORY,
  UNISWAP_V3_FACTORY,
  USDC_DECIMALS,
  WETH_DECIMALS,
  WETH_TOKEN,
  WETH_USDC_POOL_ADDRESS,
  ZERO_ADDRESS
} from '@/constants'
import { compactMap, isNull, retry } from '@/functions'
import { EthAddress, EthAddressSchema, GetTokenPoolResponse, TokenPoolType } from '@/types'
import { ChainId, CurrencyAmount, Token, WETH9 } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import BigNumber from 'bignumber.js'
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

export async function fetchEthereumPrice(
  basePublicClient: PublicClient
): Promise<{ price: BigNumber; updatedAt: Date }> {
  try {
    const [sqrtPriceX96, , , , , ,] = await retry(() =>
      basePublicClient.readContract({
        address: WETH_USDC_POOL_ADDRESS,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'slot0'
      })
    )

    const sqrtPriceX96BigDecimal = new BigNumber(sqrtPriceX96.toString())
    const numerator = sqrtPriceX96BigDecimal.times(sqrtPriceX96BigDecimal)
    const denominator = BigInt(2) ** BigInt(192)
    const priceRatio = numerator.dividedBy(new BigNumber(denominator.toString()))

    const decimalAdjustment = BigInt(10) ** BigInt(Math.abs(WETH_DECIMALS - USDC_DECIMALS))
    const priceInUSD =
      WETH_DECIMALS > USDC_DECIMALS
        ? priceRatio.times(new BigNumber(decimalAdjustment.toString()))
        : priceRatio.dividedBy(new BigNumber(decimalAdjustment.toString()))

    return { price: priceInUSD, updatedAt: new Date() }
  } catch (error) {
    console.error('Error fetching Ethereum price from Uniswap V3:', error)
    throw new Error('Failed to fetch Ethereum price')
  }
}

export async function getUniswapV3TickSpacing(
  fee: number,
  publicClient: PublicClient
): Promise<number> {
  try {
    const tickSpacing = await retry(() =>
      publicClient.readContract({
        address: UNISWAP_V3_FACTORY,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: 'feeAmountTickSpacing',
        args: [fee]
      })
    )

    return tickSpacing
  } catch (error) {
    console.error('Error fetching Uniswap V3 tick spacing:', error)
    throw new Error('Failed to fetch Uniswap V3 tick spacing')
  }
}

export async function findTokenWETHPool(
  token: EthAddress,
  publicClient: PublicClient
): Promise<GetTokenPoolResponse> {
  const feeTiers = [500, 3000, 10000]

  const poolPromises = feeTiers.map(async (fee) => {
    const v3Response = await publicClient.readContract({
      address: UNISWAP_V3_FACTORY,
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: 'getPool',
      args: [token, WETH_TOKEN, fee]
    })

    if (v3Response !== ZERO_ADDRESS) {
      const liquidity = await getPoolLiquidityAtCurrentTick(v3Response, publicClient)
      return { poolType: TokenPoolType.UniswapV3, poolFee: fee, liquidity }
    }
    return undefined
  })

  const poolResults = await Promise.all(poolPromises)
  const validPools = compactMap(poolResults)

  if (validPools.length === 0) {
    const v2Response = await publicClient.readContract({
      address: UNISWAP_V2_FACTORY,
      abi: UNISWAP_V2_FACTORY_ABI,
      functionName: 'getPair',
      args: [token, WETH_TOKEN]
    })

    if (v2Response !== ZERO_ADDRESS) {
      return {
        poolType: TokenPoolType.UniswapV2,
        poolFee: 0
      }
    } else {
      throw new Error('No pool found')
    }
  }

  const deepestPool = validPools.reduce((max, pool) =>
    pool.liquidity > max.liquidity ? pool : max
  )

  return {
    poolType: deepestPool.poolType,
    poolFee: deepestPool.poolFee
  }
}

async function getPoolLiquidityAtCurrentTick(
  poolAddress: EthAddress,
  publicClient: PublicClient
): Promise<bigint> {
  const [, tick] = await publicClient.readContract({
    address: poolAddress,
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'slot0',
        outputs: [
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'slot0',
    args: []
  })

  const [liquidity] = await publicClient.readContract({
    address: poolAddress,
    abi: [
      {
        constant: true,
        inputs: [{ name: 'tick', type: 'int24' }],
        name: 'ticks',
        outputs: [
          { name: 'liquidityGross', type: 'uint128' },
          { name: 'liquidityNet', type: 'int128' }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'ticks',
    args: [tick]
  })

  return liquidity
}

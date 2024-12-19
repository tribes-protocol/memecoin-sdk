import { UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI } from '@/abi'
import {
  UNISWAP_V3_FACTORY,
  USDC_DECIMALS,
  WETH_DECIMALS,
  WETH_TOKEN,
  WETH_USDC_POOL_ADDRESS,
  ZERO_ADDRESS
} from '@/constants'
import { retry } from '@/functions'
import { EthAddress, TokenPoolType, WETHPoolLiquidity } from '@/types'
import BigNumber from 'bignumber.js'
import { PublicClient } from 'viem'

export class UniswapV3 {
  constructor(private readonly publicClient: PublicClient) {}

  async getWETHPoolLiquidity(token: EthAddress, fee: number): Promise<WETHPoolLiquidity> {
    const poolAddress = await this.publicClient.readContract({
      address: UNISWAP_V3_FACTORY,
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: 'getPool',
      args: [token, WETH_TOKEN, fee]
    })

    if (poolAddress === ZERO_ADDRESS) {
      return { poolType: TokenPoolType.UniswapV3, poolFee: fee, liquidity: 0n }
    }

    const [, tick] = await this.publicClient.readContract({
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

    const [liquidity] = await this.publicClient.readContract({
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

    return { poolType: TokenPoolType.UniswapV3, poolFee: fee, liquidity }
  }

  async fetchEthereumPrice(): Promise<{ price: BigNumber; updatedAt: Date }> {
    try {
      const [sqrtPriceX96, , , , , ,] = await retry(() =>
        this.publicClient.readContract({
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

  async getUniswapV3TickSpacing(fee: number): Promise<number> {
    try {
      const tickSpacing = await retry(() =>
        this.publicClient.readContract({
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
}

import { UNISWAP_V2_FACTORY_ABI, UNISWAP_V2_PAIR_ABI } from '@/abi'
import { UNISWAP_V2_FACTORY, WETH_TOKEN, ZERO_ADDRESS } from '@/constants'
import { isNull } from '@/functions'
import { EthAddress, TokenPoolType, WETHPoolLiquidity } from '@/types'
import { PublicClient } from 'viem'

export class UniswapV2 {
  constructor(private readonly publicClient: PublicClient) {}

  async getWETHPoolLiquidity(token: EthAddress): Promise<WETHPoolLiquidity> {
    const pairAddress = await this.publicClient.readContract({
      address: UNISWAP_V2_FACTORY,
      abi: UNISWAP_V2_FACTORY_ABI,
      functionName: 'getPair',
      args: [token, WETH_TOKEN]
    })

    if (pairAddress === ZERO_ADDRESS) {
      return { poolType: TokenPoolType.UniswapV2, poolFee: 0, liquidity: 0n }
    }

    const reserves = await this.publicClient.readContract({
      address: pairAddress,
      abi: UNISWAP_V2_PAIR_ABI,
      functionName: 'getReserves'
    })

    if (!Array.isArray(reserves) || reserves.length < 2) {
      throw new Error('Invalid reserves')
    }

    const [reserve0, reserve1] = reserves.slice(0, 2).map(BigInt)

    if (isNull(reserve0) || isNull(reserve1)) {
      throw new Error('Invalid reserves')
    }

    // Assuming token is token0, otherwise swap reserves
    const liquidity = token < WETH_TOKEN ? reserve0 : reserve1

    return { poolType: TokenPoolType.UniswapV2, poolFee: 0, liquidity }
  }
}

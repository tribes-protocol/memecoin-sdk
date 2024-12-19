import { UNISWAP_V3_FACTORY_ABI } from '@/abi'
import { UNISWAP_V3_FACTORY, WETH_TOKEN, ZERO_ADDRESS } from '@/constants'
import { EthAddress, TokenPoolType, WETHPoolLiquidity } from '@/types'
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
}

import { EthAddress } from '@/types'
import { PublicClient } from 'viem'

export class UniswapV3 {
  constructor(private readonly publicClient: PublicClient) {}

  async getPoolLiquidityAtCurrentTick(poolAddress: EthAddress): Promise<bigint> {
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

    return liquidity
  }
}

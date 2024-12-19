import { isValidBigIntString, toJsonTree } from '@/functions'
import { EthAddress, HexString, HydratedCoin, HydratedCoinSchema, NewCoin } from '@/types'

export class MemecoinAPI {
  private readonly apiBaseUrl: string

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl
  }

  async getCoin(id: EthAddress | number): Promise<HydratedCoin | undefined> {
    if (typeof id === 'number') {
      const response = await fetch(`${this.apiBaseUrl}/api/coins/get-by-id`, {
        method: 'POST',
        body: JSON.stringify({ coinId: id }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 404) {
        return undefined
      }

      const data = HydratedCoinSchema.parse(await response.json())
      return data
    }

    const response = await fetch(`${this.apiBaseUrl}/api/coins/${id}`)
    if (response.status === 404) {
      return undefined
    }

    const data = HydratedCoinSchema.parse(await response.json())
    return data
  }

  async getTrending(): Promise<HydratedCoin[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/trending-coins`)
    const data = HydratedCoinSchema.array().parse(await response.json())
    return data
  }

  async estimateBuy(coin: EthAddress, amountIn: bigint): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-amount-out-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memeTokenAddress: coin,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async estimateSell(coin: EthAddress, amountIn: bigint): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-amount-out-eth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memeTokenAddress: coin,
        amountIn: amountIn.toString()
      })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async getERC20Allowance(
    tokenAddress: EthAddress,
    spenderAddress: EthAddress,
    accountAddress: EthAddress
  ): Promise<bigint> {
    const response = await fetch(`${this.apiBaseUrl}/api/coins/get-erc20-allowance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenAddress, spenderAddress, accountAddress })
    })

    const result = await response.json()

    if (!isValidBigIntString(result)) {
      throw new Error('Invalid response format')
    }

    return BigInt(result)
  }

  async launchCoin(coin: NewCoin, txHash: HexString): Promise<void> {
    const tree = toJsonTree({
      coin,
      txHash
    })

    const response = await fetch(`${this.apiBaseUrl}/api/coins/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tree)
    })

    if (!response.ok) {
      throw new Error('Failed to launch coin')
    }
  }
}

'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  BuyFrontendParams,
  BuyManyParams,
  EstimateSwapParams,
  EstimateTradeParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  LaunchCoinResponse,
  SellFrontendParams,
  SwapFrontendParams
} from '@/types'
import { getUniswapPair } from '@/uniswap'
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useContext } from 'react'
import { useWalletClient } from 'wagmi'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<bigint>
  estimateBuy: (params: EstimateTradeParams) => Promise<bigint>
  buy: (params: BuyFrontendParams) => Promise<HexString>
  sell: (params: SellFrontendParams) => Promise<HexString>
  estimateSell: (params: EstimateTradeParams) => Promise<bigint>
  swap: (params: SwapFrontendParams) => Promise<HexString>
  buyMany: (params: BuyManyParams) => Promise<HexString>
  launchCoin: (params: LaunchCoinParams) => Promise<LaunchCoinResponse>
  getPair: (coin: EthAddress) => Promise<Pair>
  getERC20Allowance: (
    tokenAddress: EthAddress,
    spenderAddress: EthAddress,
    accountAddress: EthAddress
  ) => Promise<bigint>
}

interface MemecoinProviderProps {
  children: ReactNode
  rpcUrl: string
  apiBaseUrl?: string
}

const MemecoinContext = createContext<MemecoinContextType | undefined>(undefined)

export const useMemecoin = (): MemecoinContextType => {
  const context = useContext(MemecoinContext)
  if (!context) {
    throw new Error('useMemecoin must be used within a MemecoinProvider')
  }
  return context
}

export const MemecoinProvider = ({
  children,
  rpcUrl,
  apiBaseUrl
}: MemecoinProviderProps): ReactNode => {
  const { data: walletClient } = useWalletClient()

  const sdk = new MemecoinSDK({
    walletClient,
    rpcUrl,
    apiBaseUrl
  })

  const contextValue = {
    getCoin: sdk.getCoin.bind(sdk),
    getTrending: sdk.getTrending.bind(sdk),
    estimateSwap: sdk.estimateSwap.bind(sdk),
    estimateBuy: sdk.estimateBuy.bind(sdk),
    buy: sdk.buy.bind(sdk),
    estimateSell: sdk.estimateSell.bind(sdk),
    sell: sdk.sell.bind(sdk),
    swap: sdk.swap.bind(sdk),
    launchCoin: sdk.launch.bind(sdk),
    getPair: (coin: EthAddress) => getUniswapPair(coin, sdk.publicClient),
    getERC20Allowance: sdk.getERC20Allowance.bind(sdk),
    buyMany: sdk.buyManyMemecoins.bind(sdk)
  }

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

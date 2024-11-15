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
import { createContext, ReactNode, useContext, useMemo } from 'react'
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

  const memecoin = useMemo(
    () =>
      new MemecoinSDK({
        walletClient,
        rpcUrl,
        apiBaseUrl
      }),
    [walletClient, rpcUrl]
  )

  const contextValue = useMemo(
    () => ({
      getCoin: memecoin.getCoin.bind(memecoin),
      getTrending: memecoin.getTrending.bind(memecoin),
      estimateSwap: memecoin.estimateSwap.bind(memecoin),
      estimateBuy: memecoin.estimateBuy.bind(memecoin),
      buy: memecoin.buy.bind(memecoin),
      estimateSell: memecoin.estimateSell.bind(memecoin),
      sell: memecoin.sell.bind(memecoin),
      swap: memecoin.swap.bind(memecoin),
      launchCoin: memecoin.launch.bind(memecoin),
      getPair: (coin: EthAddress) => getUniswapPair(coin, memecoin.publicClient),
      getERC20Allowance: memecoin.getERC20Allowance.bind(memecoin),
      buyMany: memecoin.buyManyMemecoins.bind(memecoin)
    }),
    [memecoin]
  )

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

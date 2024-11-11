'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  BuyManyParams,
  EstimateTradeParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  TradeBuyParams,
  TradeSellParams
} from '@/types'
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { useWalletClient } from 'wagmi'
import { useCapabilities } from 'wagmi/experimental'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateBuy: (params: EstimateTradeParams) => Promise<bigint>
  estimateSell: (params: EstimateTradeParams) => Promise<bigint>
  buy: (params: TradeBuyParams) => Promise<HexString>
  sell: (params: TradeSellParams) => Promise<HexString>
  buyMany: (params: BuyManyParams) => Promise<HexString>
  launchCoin: (params: LaunchCoinParams) => Promise<[EthAddress, HexString]>
  getPair: (coin: HydratedCoin) => Promise<Pair>
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
  const { data: capabilities } = useCapabilities()

  const memecoin = useMemo(
    () =>
      new MemecoinSDK({
        walletClient,
        rpcUrl,
        apiBaseUrl,
        capabilities
      }),
    [walletClient, rpcUrl, capabilities]
  )

  const contextValue = useMemo(
    () => ({
      getCoin: memecoin.getCoin.bind(memecoin),
      getTrending: memecoin.getTrending.bind(memecoin),
      estimateBuy: memecoin.estimateBuy.bind(memecoin),
      estimateSell: memecoin.estimateSell.bind(memecoin),
      buy: memecoin.buy.bind(memecoin),
      sell: memecoin.sell.bind(memecoin),
      launchCoin: memecoin.launch.bind(memecoin),
      getPair: memecoin.getPair.bind(memecoin),
      getERC20Allowance: memecoin.getERC20Allowance.bind(memecoin),
      buyMany: memecoin.buyManyMemecoins.bind(memecoin)
    }),
    [memecoin]
  )

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

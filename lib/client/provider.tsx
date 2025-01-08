'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  EstimateLaunchBuyParams,
  EstimateSwapParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  LaunchCoinResponse,
  SwapEstimation,
  SwapParams
} from '@/types'

import { createContext, ReactNode, useContext, useMemo } from 'react'
import { useWalletClient } from 'wagmi'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin | undefined>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<SwapEstimation>
  swap: (params: SwapParams) => Promise<HexString>
  launchCoin: (params: LaunchCoinParams) => Promise<LaunchCoinResponse>
  estimateLaunchBuy: (params: EstimateLaunchBuyParams) => Promise<bigint>
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

  const contextValue = useMemo(() => {
    const sdk = new MemecoinSDK({
      walletClient,
      rpcUrl,
      apiBaseUrl
    })

    console.log('memecoin.new sdk initialized')

    return {
      getCoin: sdk.getCoin.bind(sdk),
      getTrending: sdk.getTrending.bind(sdk),
      estimateSwap: sdk.estimateSwap.bind(sdk),
      swap: sdk.swap.bind(sdk),
      launchCoin: sdk.launch.bind(sdk),
      estimateLaunchBuy: sdk.estimateLaunchBuy.bind(sdk)
    }
  }, [walletClient?.account.address, rpcUrl, apiBaseUrl])

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

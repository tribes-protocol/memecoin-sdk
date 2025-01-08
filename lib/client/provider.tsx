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
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useContext } from 'react'
import { useWalletClient } from 'wagmi'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin | undefined>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<SwapEstimation>
  swap: (params: SwapParams) => Promise<HexString>
  launchCoin: (params: LaunchCoinParams) => Promise<LaunchCoinResponse>
  getPair: (coin: EthAddress) => Promise<Pair>
  getERC20Allowance: (
    tokenAddress: EthAddress,
    spenderAddress: EthAddress,
    accountAddress: EthAddress
  ) => Promise<bigint>
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

  const sdk = new MemecoinSDK({
    walletClient,
    rpcUrl,
    apiBaseUrl
  })

  const contextValue = {
    getCoin: sdk.getCoin.bind(sdk),
    getTrending: sdk.getTrending.bind(sdk),
    estimateSwap: sdk.estimateSwap.bind(sdk),
    swap: sdk.swap.bind(sdk),
    launchCoin: sdk.launch.bind(sdk),
    getPair: sdk.getUniswapPair.bind(sdk),
    getERC20Allowance: sdk.getERC20Allowance.bind(sdk),
    predictDirectLaunchToken: sdk.predictDirectLaunchToken.bind(sdk),
    estimateLaunchBuy: sdk.estimateLaunchBuy.bind(sdk)
  }

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

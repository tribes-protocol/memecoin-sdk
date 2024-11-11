'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  BuyManyParams,
  EstimateSwapParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  SwapParams
} from '@/types'
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { useWalletClient } from 'wagmi'
import { useCapabilities } from 'wagmi/experimental'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<bigint>
  swap: (params: SwapParams) => Promise<HexString>
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
      estimateSwap: memecoin.estimateSwap.bind(memecoin),
      swap: memecoin.swap.bind(memecoin),
      launchCoin: memecoin.launch.bind(memecoin),
      getPair: memecoin.getPair.bind(memecoin),
      getERC20Allowance: memecoin.getERC20Allowance.bind(memecoin),
      buyMany: memecoin.buyManyMemecoins.bind(memecoin)
    }),
    [memecoin]
  )

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

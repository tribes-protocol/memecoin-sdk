'use client'

import { getPair } from '@/functions'
import { MemecoinSDK } from '@/Memecoin'
import {
  BuyManyParams,
  EstimateSwapParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParams,
  LaunchCoinResponse,
  SwapParams
} from '@/types'
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<bigint>
  swap: (params: SwapParams) => Promise<HexString>
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
  const publicClient = usePublicClient()

  const memecoin = useMemo(
    () =>
      new MemecoinSDK({
        walletClient,
        rpcUrl,
        apiBaseUrl
      }),
    [walletClient, rpcUrl]
  )

  const getUniswapPair = useCallback(
    (coin: EthAddress): Promise<Pair> => getPair(coin, publicClient),
    [publicClient]
  )

  const contextValue = useMemo(
    () => ({
      getCoin: memecoin.getCoin.bind(memecoin),
      getTrending: memecoin.getTrending.bind(memecoin),
      estimateSwap: memecoin.estimateSwap.bind(memecoin),
      swap: memecoin.swap.bind(memecoin),
      launchCoin: memecoin.launch.bind(memecoin),
      getPair: getUniswapPair,
      getERC20Allowance: memecoin.getERC20Allowance.bind(memecoin),
      buyMany: memecoin.buyManyMemecoins.bind(memecoin)
    }),
    [memecoin, getUniswapPair]
  )

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

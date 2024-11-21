'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  BuyFrontendParams,
  BuyManyParamsFrontend,
  EstimateSwapParams,
  EstimateTradeParams,
  EthAddress,
  HexString,
  HydratedCoin,
  LaunchCoinParamsFrontend,
  LaunchCoinResponse,
  SellFrontendParams,
  SwapFrontendParams
} from '@/types'
import { getUniswapPair } from '@/uniswap'
import { Pair } from '@uniswap/v2-sdk'
import { getWalletClient } from '@wagmi/core'
import { createContext, ReactNode, useContext } from 'react'
import { useConfig, useWalletClient } from 'wagmi'

type BuyParams = Omit<BuyFrontendParams, 'walletClient'>
type SwapParams =
  | Omit<Extract<SwapFrontendParams, { fromToken: HydratedCoin }>, 'walletClient'>
  | Omit<Extract<SwapFrontendParams, { fromToken: 'eth' }>, 'walletClient'>
type SellParams = Omit<SellFrontendParams, 'walletClient'>
type LaunchCoinParams = Omit<LaunchCoinParamsFrontend, 'walletClient'>
type BuyManyParams = Omit<BuyManyParamsFrontend, 'walletClient'>

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateSwap: (params: EstimateSwapParams) => Promise<bigint>
  estimateBuy: (params: EstimateTradeParams) => Promise<bigint>
  buy: (params: BuyParams) => Promise<HexString>
  sell: (params: SellParams) => Promise<HexString>
  estimateSell: (params: EstimateTradeParams) => Promise<bigint>
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
  const config = useConfig()

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
    buy: async (params: BuyParams) =>
      sdk.buy({ ...params, walletClient: await getWalletClient(config) }),
    estimateSell: sdk.estimateSell.bind(sdk),
    sell: async (params: SellParams) =>
      sdk.sell({ ...params, walletClient: await getWalletClient(config) }),
    swap: async (params: SwapParams) =>
      sdk.swap({ ...params, walletClient: await getWalletClient(config) }),
    launchCoin: async (params: LaunchCoinParams) =>
      sdk.launch({ ...params, walletClient: await getWalletClient(config) }),
    getPair: (coin: EthAddress) => getUniswapPair(coin, sdk.publicClient),
    getERC20Allowance: sdk.getERC20Allowance.bind(sdk),
    buyMany: async (params: BuyManyParams) =>
      sdk.buyManyMemecoins({ ...params, walletClient: await getWalletClient(config) })
  }

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

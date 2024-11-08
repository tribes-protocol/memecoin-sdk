'use client'

import { MemecoinSDK } from '@/Memecoin'
import {
  EthAddress,
  GenerateMemecoinFromPhraseResponse,
  HexString,
  HydratedCoin,
  BuyManyParams,
  EstimateTradeParams,
  GenerateCoinParams,
  LaunchCoinParams,
  TradeParams
} from '@/types'
import { Pair } from '@uniswap/v2-sdk'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import { WalletCapabilities, WalletCapabilitiesRecord } from 'viem'
import { useWalletClient } from 'wagmi'

interface MemecoinContextType {
  getCoin: (id: EthAddress | number) => Promise<HydratedCoin>
  getTrending: () => Promise<HydratedCoin[]>
  estimateBuy: (params: EstimateTradeParams) => Promise<bigint>
  estimateSell: (params: EstimateTradeParams) => Promise<bigint>
  buy: (params: TradeParams, coin: HydratedCoin) => Promise<HexString>
  sell: (
    params: TradeParams,
    coin: HydratedCoin,
    capabilities: WalletCapabilitiesRecord<WalletCapabilities, number>
  ) => Promise<HexString>
  buyMany: (params: BuyManyParams, memePool: EthAddress) => Promise<HexString>
  generateCoin: (params: GenerateCoinParams) => Promise<GenerateMemecoinFromPhraseResponse>
  launchCoin: (params: LaunchCoinParams) => Promise<[EthAddress, HexString]>
  getTeamFee: () => Promise<bigint>
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
}

const MemecoinContext = createContext<MemecoinContextType | undefined>(undefined)

export const useMemecoin = (): MemecoinContextType => {
  const context = useContext(MemecoinContext)
  if (!context) {
    throw new Error('useMemecoin must be used within a MemecoinProvider')
  }
  return context
}

export const MemecoinProvider = ({ children, rpcUrl }: MemecoinProviderProps): ReactNode => {
  const { data: walletClient } = useWalletClient()
  if (!walletClient) {
    throw new Error('MemecoinProvider must be used within a WagmiProvider')
  }

  const memecoin = useMemo(
    () =>
      new MemecoinSDK({
        walletClient,
        rpcUrl
      }),
    [walletClient, rpcUrl]
  )

  const contextValue = useMemo(
    () => ({
      getCoin: memecoin.getCoin.bind(memecoin),
      getTrending: memecoin.getTrending.bind(memecoin),
      estimateBuy: memecoin.estimateBuy.bind(memecoin),
      estimateSell: memecoin.estimateSell.bind(memecoin),
      buy: memecoin.buy.bind(memecoin),
      sell: memecoin.sell.bind(memecoin),
      generateCoin: memecoin.generateCoin.bind(memecoin),
      launchCoin: memecoin.launch.bind(memecoin),
      getTeamFee: memecoin.getTeamFee.bind(memecoin),
      getPair: memecoin.getPair.bind(memecoin),
      getERC20Allowance: memecoin.getERC20Allowance.bind(memecoin),
      buyMany: memecoin.buyManyMemecoins.bind(memecoin)
    }),
    [memecoin]
  )

  return <MemecoinContext.Provider value={contextValue}>{children}</MemecoinContext.Provider>
}

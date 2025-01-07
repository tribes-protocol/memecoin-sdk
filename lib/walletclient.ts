import { MemecoinSDKConfig } from '@/types'
import { createWalletClient, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

export function getWalletClient(config: MemecoinSDKConfig): WalletClient {
  if ('walletClient' in config && config.walletClient) {
    return config.walletClient
  } else if ('privateKey' in config && config.privateKey) {
    return createWalletClient({
      account: privateKeyToAccount(config.privateKey),
      chain: base,
      transport: http(config.rpcUrl)
    })
  } else {
    throw new Error('Wallet client is required for write operations')
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import { MemecoinSDK } from '@/Memecoin'
import { createWalletClient, formatEther, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ethRPC = 'https://base-mainnet.g.alchemy.com/v2/redacted'
const account = privateKeyToAccount('0xredacted')
const walletClient = createWalletClient({
  account,
  transport: http(ethRPC)
})

// Initialize SDK
const sdk = new MemecoinSDK({
  rpcUrl: ethRPC,
  walletClient
})

async function launchToken(): Promise<void> {
  try {
    const launchParams = {
      name: 'Test Coin',
      ticker: 'TEST',
      marketCap: BigInt(21000 * 1e6),
      antiSnipeAmount: parseEther('0.00001'), // 0.1 ETH anti-snipe,
      description: 'Test Coin',
      image: 'https://via.placeholder.com/150',
      account: account.address
    }

    const { salt, token, amountOut, ethToRaise } = await sdk.estimateLaunch(launchParams)

    console.log('estimate', formatEther(amountOut))

    const result = await sdk.launch({
      ...launchParams,
      salt,
      token,
      ethToRaise
    })

    console.log('Launch successful!')
    console.log('Contract Address:', result.contractAddress)
    console.log('Transaction Hash:', result.txHash)
  } catch (error) {
    console.error('Launch failed:', error)
  }
}

async function swapToken(): Promise<void> {
  try {
    const { amountOut, swapParams } = await sdk.estimateSwap({
      account: account.address,
      tokenIn: '0x4200000000000000000000000000000000000006',
      amountIn: parseEther('0.0001'),
      tokenOut: '0x1ecc800Bc0471F2DFCbd50b2a306D76D22eA3caa' // TEST token on bonding curve
    })
    console.log('amountOut', formatEther(amountOut))

    const tx = await sdk.swap(swapParams)
    console.log('tx', tx)
  } catch (error) {
    console.error('Swap failed:', error)
  }
}

// launchToken().catch(console.error)
swapToken().catch(console.error)

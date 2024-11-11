# Memecoin SDK Documentation

The **Memecoin SDK** provides a powerful interface for interacting with Memecoin smart contracts, accessing token data, and executing token trades. Designed with flexibility in mind, the SDK can be used both in standalone applications and within React projects.

## Installation

Install the Memecoin SDK and required peer dependencies:

```bash
yarn add @memecoin/sdk
```

or

```bash
bun add @memecoin/sdk
```

You'll also need the following peer dependencies:

```bash
npm install react react-dom @tanstack/react-query wagmi viem
```

---

## Quick Start

To initialize and configure the SDK, create a new `MemecoinSDK` instance:

```typescript
import { MemecoinSDK } from '@memecoin/sdk'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  transport: http(RPC_URL)
})

const sdk = new MemecoinSDK({
  rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/demo',
  walletClient // Optional, only needed for write operations
})
```

## Core Methods

The SDK provides methods for accessing coin information, estimating and executing trades, and creating or launching tokens.

### Get Coin Information

```typescript
const coin = await sdk.getCoin(1) // Fetch by coin ID
```

### Get Trending Coins

```typescript
const trendingCoins = await sdk.getTrending()
```

### Estimate Buy

Estimate the amount of tokens received from a buy order:

```typescript
const amountOut = await sdk.estimateBuy({
  coin,
  amountIn: BigInt(10000000000000000)
})
```

### Buy Tokens

Execute a buy transaction for a specific coin:

```typescript
const transactionHash = await sdk.buy({
  coin,
  amountIn: BigInt(10000000000000000),
  amountOut: BigInt(50000000000000000) // Expected output tokens
})
```

### Estimate Sell

Estimate the amount of ETH received from a sell order:

```typescript
const amountOut = await sdk.estimateSell({
  coin,
  amountIn: BigInt(50000000000000000)
})
```

### Sell Tokens

Execute a sell transaction for a specific coin:

```typescript
const transactionHash = await sdk.sell({
  coin,
  amountIn: BigInt(50000000000000000),
  amountOut: BigInt(10000000000000000) // Expected output ETH
})
```

### Launch a Coin

Launch a newly generated token:

```typescript
const [contractAddress, txHash] = await sdk.launch({
  name: 'New Meme',
  ticker: 'NMEME',
  antiSnipeAmount: BigInt(1000000000000000),
  image: 'https://example.com/image.png',
  website: 'https://example.com'
})
```

---

## React Integration with `MemecoinProvider`

For React applications, the SDK can be integrated using the `MemecoinProvider` context. This provides easy access to the SDK methods throughout the component tree.

### Provider Setup

In your root component:

```typescript
import { MemecoinProvider } from '@memecoin/sdk';
import { WagmiConfig } from 'wagmi';
import { useMemo } from 'react';

const rpcUrl = 'https://base-mainnet.g.alchemy.com/v2/demo';

function App({ children }) {
  return (
    <MemecoinProvider rpcUrl={rpcUrl}>
      {children}
    </MemecoinProvider>
  );
}
```

### Accessing SDK Methods

Inside any component, you can access SDK methods using the `useMemecoin` hook:

```typescript
import { useMemecoin } from '@memecoin/sdk';

function CoinInfo() {
  const { getCoin, getTrending } = useMemecoin();

  useEffect(() => {
    async function fetchCoin() {
      const coin = await getCoin(1);
      console.log('Fetched coin:', coin);
    }

    fetchCoin();
  }, [getCoin]);

  return <div>Check console for coin data</div>;
}
```

### Example: Buying a Coin

```typescript
function BuyCoin({ coinId }) {
  const { getCoin, buy } = useMemecoin();

  const handleBuy = async () => {
    const coin = await getCoin(coinId);
    const transactionHash = await buy({
      coin,
      amountIn: BigInt(10000000000000000),
      amountOut: BigInt(50000000000000000)
    });
    console.log('Transaction Hash:', transactionHash);
  };

  return <button onClick={handleBuy}>Buy Coin</button>;
}
```

---

## Testing

The SDK includes `vitest` tests to validate its functionality. Each test is configured with specific conditions and uses mock data.

## API Reference

### `getCoin(id: EthAddress | number): Promise<HydratedCoin>`

Fetches a coin by its ID or Ethereum address.

### `getTrending(): Promise<HydratedCoin[]>`

Retrieves a list of trending Memecoins.

### `estimateBuy(params: EstimateTradeParams): Promise<bigint>`

Estimates the token amount received for a given ETH input.

### `buy(params: TradeBuyParams): Promise<HexString>`

Executes a buy transaction on either Uniswap or the Memecoin pool.

### `estimateSell(params: EstimateTradeParams): Promise<bigint>`

Estimates the ETH amount received for a given token input.

### `sell(params: TradeSellParams): Promise<HexString>`

Executes a sell transaction on either Uniswap or the Memecoin pool.

### `generateCoin(params: GenerateCoinParams): Promise<GenerateMemecoinFromPhraseResponse>`

Generates a new Memecoin based on a given prompt.

### `launch(params: LaunchCoinParams): Promise<[EthAddress, HexString]>`

Launches a newly generated Memecoin with specified properties.

---

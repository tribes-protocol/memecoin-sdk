export const CREATE_MEME_ABI_V2 = [
  {
    type: 'function',
    name: 'CreateMeme',
    inputs: [
      { name: '_name', type: 'string', internalType: 'string' },
      { name: '_symbol', type: 'string', internalType: 'string' },
      { name: '_data', type: 'string', internalType: 'string' },
      { name: '_totalSupply', type: 'uint256', internalType: 'uint256' },
      { name: '_liquidityETHAmount', type: 'uint256', internalType: 'uint256' },
      { name: '_baseToken', type: 'address', internalType: 'address' },
      { name: '_router', type: 'address', internalType: 'address' },
      { name: '_antiSnipe', type: 'bool', internalType: 'bool' },
      { name: '_amountAntiSnipe', type: 'uint256', internalType: 'uint256' },
      {
        name: '_lockedDeadlineDays',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'payable'
  }
]

export const BUY_MANY_TOKENS_ABI_V2 = [
  {
    type: 'function',
    name: 'buyManyTokens',
    inputs: [
      { name: 'memeTokens', type: 'address[]', internalType: 'address[]' },
      { name: 'minTokensAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'ethAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_affiliate', type: 'address', internalType: 'address' },
      {
        name: '_lockedDeadlineDays',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
]

export const BUY_TOKENS_ABI_V2 = [
  {
    type: 'function',
    name: 'buyTokens',
    inputs: [
      { name: 'memeToken', type: 'address', internalType: 'address' },
      { name: 'minTokens', type: 'uint256', internalType: 'uint256' },
      { name: '_affiliate', type: 'address', internalType: 'address' },
      {
        name: '_lockedDeadlineDays',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
]

export const SELL_TOKENS_ABI_V2 = [
  {
    type: 'function',
    name: 'sellTokens',
    inputs: [
      { name: 'memeToken', type: 'address', internalType: 'address' },
      { name: 'tokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'minEth', type: 'uint256', internalType: 'uint256' },
      { name: '_affiliate', type: 'address', internalType: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool', internalType: 'bool' },
      { name: '', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  }
]

export const SWAP_EXACT_ETH_FOR_TOKENS_ABI = [
  {
    inputs: [
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'fee', type: 'uint256' }
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function'
  }
]

export const SWAP_EXACT_TOKENS_FOR_ETH_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'fee', type: 'uint256' }
    ],
    name: 'swapExactTokensForETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  }
]

export const SWAP_MEMECOIN_ABI = [
  {
    type: 'function',
    name: 'swap',
    inputs: [
      { name: 'fromToken', type: 'address', internalType: 'address' },
      { name: 'toToken', type: 'address', internalType: 'address' },
      { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
      {
        name: 'minAmountOut',
        type: 'uint256',
        internalType: 'uint256'
      },
      { name: '_affiliate', type: 'address', internalType: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
]

export const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export const UNISWAP_V3_FACTORY_ABI = [
  {
    inputs: [{ internalType: 'uint24', name: 'fee', type: 'uint24' }],
    name: 'feeAmountTickSpacing',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export const UNISWAPV3_GENERATE_SALT_ABI = [
  {
    type: 'function',
    name: 'generateSalt',
    inputs: [
      { name: 'deployer', type: 'address', internalType: 'address' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'symbol', type: 'string', internalType: 'string' },
      { name: 'supply', type: 'uint256', internalType: 'uint256' },
      { name: 'data', type: 'string', internalType: 'string' }
    ],
    outputs: [
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      { name: 'token', type: 'address', internalType: 'address' }
    ],
    stateMutability: 'view'
  }
]

export const UNISWAPV3_LAUNCH_ABI = [
  {
    type: 'function',
    name: 'launch',
    inputs: [
      { name: '_name', type: 'string', internalType: 'string' },
      { name: '_symbol', type: 'string', internalType: 'string' },
      { name: '_supply', type: 'uint256', internalType: 'uint256' },
      { name: '_initialTick', type: 'int24', internalType: 'int24' },
      { name: '_fee', type: 'uint24', internalType: 'uint24' },
      { name: '_salt', type: 'bytes32', internalType: 'bytes32' },
      { name: '_deployer', type: 'address', internalType: 'address' },
      { name: '_data', type: 'string', internalType: 'string' }
    ],
    outputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'contract MemecoinERC20'
      },
      { name: 'tokenId', type: 'uint256', internalType: 'uint256' }
    ],
    stateMutability: 'payable'
  }
]

export const UNISWAP_V3_SWAP_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  }
]

export const REWARDS_DISTRIBUTED_EVENT_ABI = [
  {
    type: 'event',
    name: 'RewardsDistributed',
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'memeCoinAddress', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  }
]

export const TRADECALL_EVENT_ABI_V1 = [
  {
    type: 'event',
    name: 'tradeCall',
    inputs: [
      { type: 'address', name: 'caller', indexed: true },
      { type: 'address', name: 'memeContract', indexed: true },
      { type: 'uint256', name: 'outAmount', indexed: false },
      { type: 'uint256', name: 'inAmount', indexed: false },
      { type: 'uint256', name: 'index', indexed: false },
      { type: 'uint256', name: 'timestamp', indexed: false },
      { type: 'string', name: 'tradeType', indexed: false }
    ]
  }
]

export const TRADECALL_EVENT_ABI_V2 = [
  {
    type: 'event',
    name: 'tradeCall',
    inputs: [
      { type: 'address', name: 'caller', indexed: true },
      { type: 'address', name: 'memeContract', indexed: true },
      { type: 'uint256', name: 'outAmount', indexed: false },
      { type: 'uint256', name: 'inAmount', indexed: false },
      { type: 'uint256', name: 'index', indexed: false },
      { type: 'uint256', name: 'timestamp', indexed: false },
      { type: 'string', name: 'tradeType', indexed: false }
    ]
  }
]

export const TRANSFER_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
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

export const MEME_CREATED_EVENT_ABI = [
  {
    type: 'event',
    name: 'memeCreated',
    inputs: [
      { type: 'address', name: 'creator', indexed: true },
      { type: 'address', name: 'memeContract', indexed: true },
      { type: 'address', name: 'tokenAddress', indexed: true },
      { type: 'string', name: 'name', indexed: false },
      { type: 'string', name: 'symbol', indexed: false },
      { type: 'string', name: 'data', indexed: false },
      { type: 'uint256', name: 'totalSupply', indexed: false },
      { type: 'uint256', name: 'initialReserve', indexed: false },
      { type: 'uint256', name: 'timestamp', indexed: false }
    ]
  }
]

export const LISTED_EVENT_ABI = [
  {
    type: 'event',
    name: 'listed',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'tokenAddress', type: 'address' },
      { indexed: true, name: 'router', type: 'address' },
      { indexed: false, name: 'liquidityAmount', type: 'uint256' },
      { indexed: false, name: 'tokenAmount', type: 'uint256' },
      { indexed: false, name: '_time', type: 'uint256' },
      { indexed: false, name: 'totalVolume', type: 'uint256' }
    ]
  }
] as const

export const CREATE_MEME_ABI_V1 = [
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
      { name: '_amountAntiSnipe', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
]

export const REWARD_RECIPIENTS_ABI_V1 = [
  {
    type: 'function',
    name: 'rewardRecipients',
    inputs: [
      { name: 'recipients', type: 'address[]', internalType: 'address[]' },
      { name: 'memecoinAddresses', type: 'address[]', internalType: 'address[]' },
      { name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
]

export const BUY_MANY_TOKENS_ABI_V1 = [
  {
    type: 'function',
    name: 'buyManyTokens',
    inputs: [
      { name: 'memeTokens', type: 'address[]', internalType: 'address[]' },
      { name: 'minTokensAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: 'ethAmounts', type: 'uint256[]', internalType: 'uint256[]' },
      { name: '_affiliate', type: 'address', internalType: 'address' }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
]

export const BUY_TOKENS_ABI_V1 = [
  {
    type: 'function',
    name: 'buyTokens',
    inputs: [
      { name: 'memeToken', type: 'address', internalType: 'address' },
      { name: 'minTokens', type: 'uint256', internalType: 'uint256' },
      { name: '_affiliate', type: 'address', internalType: 'address' }
    ],
    outputs: [],
    stateMutability: 'payable'
  }
]

export const SELL_TOKENS_ABI_V1 = [
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
      { name: '', type: 'bool', internalType: 'bool' }
    ],
    stateMutability: 'nonpayable'
  }
]

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

export const REWARD_RECIPIENTS_ABI_V2 = [
  {
    type: 'function',
    name: 'rewardRecipients',
    inputs: [
      { name: 'recipients', type: 'address[]', internalType: 'address[]' },
      { name: 'memecoinAddresses', type: 'address[]', internalType: 'address[]' },
      { name: 'amounts', type: 'uint256[]', internalType: 'uint256[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
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

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
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
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

export const UNISWAP_V3_PREDICT_TOKEN = [
  {
    type: 'function',
    name: 'predictToken',
    inputs: [
      { name: 'deployer', type: 'address', internalType: 'address' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'symbol', type: 'string', internalType: 'string' },
      { name: 'supply', type: 'uint256', internalType: 'uint256' },
      { name: 'data', type: 'string', internalType: 'string' },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
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
      { name: 'tokenId', type: 'uint256', internalType: 'uint256' },
      { name: 'amountSwapped', type: 'uint256', internalType: 'uint256' }
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

export const UNISWAP_V3_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_factoryV2', type: 'address' },
      { internalType: 'address', name: 'factoryV3', type: 'address' },
      { internalType: 'address', name: '_positionManager', type: 'address' },
      { internalType: 'address', name: '_WETH9', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'WETH9',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'approveMax',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'approveMaxMinusOne',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'approveZeroThenMax',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'approveZeroThenMaxMinusOne',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes', name: 'data', type: 'bytes' }],
    name: 'callPositionManager',
    outputs: [{ internalType: 'bytes', name: 'result', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes[]', name: 'paths', type: 'bytes[]' },
      { internalType: 'uint128[]', name: 'amounts', type: 'uint128[]' },
      { internalType: 'uint24', name: 'maximumTickDivergence', type: 'uint24' },
      { internalType: 'uint32', name: 'secondsAgo', type: 'uint32' }
    ],
    name: 'checkOracleSlippage',
    outputs: [],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes', name: 'path', type: 'bytes' },
      { internalType: 'uint24', name: 'maximumTickDivergence', type: 'uint24' },
      { internalType: 'uint32', name: 'secondsAgo', type: 'uint32' }
    ],
    name: 'checkOracleSlippage',
    outputs: [],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' }
        ],
        internalType: 'struct IV3SwapRouter.ExactInputParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInput',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        internalType: 'struct IV3SwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'bytes', name: 'path', type: 'bytes' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
          { internalType: 'uint256', name: 'amountInMaximum', type: 'uint256' }
        ],
        internalType: 'struct IV3SwapRouter.ExactOutputParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactOutput',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
          { internalType: 'uint256', name: 'amountInMaximum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' }
        ],
        internalType: 'struct IV3SwapRouter.ExactOutputSingleParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'exactOutputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'factoryV2',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'getApprovalType',
    outputs: [{ internalType: 'enum IApproveAndCall.ApprovalType', name: '', type: 'uint8' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'token0', type: 'address' },
          { internalType: 'address', name: 'token1', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' }
        ],
        internalType: 'struct IApproveAndCall.IncreaseLiquidityParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'increaseLiquidity',
    outputs: [{ internalType: 'bytes', name: 'result', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'token0', type: 'address' },
          { internalType: 'address', name: 'token1', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'int24', name: 'tickLower', type: 'int24' },
          { internalType: 'int24', name: 'tickUpper', type: 'int24' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' }
        ],
        internalType: 'struct IApproveAndCall.MintParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'mint',
    outputs: [{ internalType: 'bytes', name: 'result', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'previousBlockhash', type: 'bytes32' },
      { internalType: 'bytes[]', name: 'data', type: 'bytes[]' }
    ],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: '', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'bytes[]', name: 'data', type: 'bytes[]' }
    ],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: '', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'positionManager',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'pull',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { inputs: [], name: 'refundETH', outputs: [], stateMutability: 'payable', type: 'function' },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' }
    ],
    name: 'selfPermit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' }
    ],
    name: 'selfPermitAllowed',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'nonce', type: 'uint256' },
      { internalType: 'uint256', name: 'expiry', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' }
    ],
    name: 'selfPermitAllowedIfNecessary',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' }
    ],
    name: 'selfPermitIfNecessary',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint256', name: 'amountInMax', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' }
    ],
    name: 'swapTokensForExactTokens',
    outputs: [{ internalType: 'uint256', name: 'amountIn', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' }
    ],
    name: 'sweepToken',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' }
    ],
    name: 'sweepToken',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' }
    ],
    name: 'sweepTokenWithFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' }
    ],
    name: 'sweepTokenWithFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'int256', name: 'amount0Delta', type: 'int256' },
      { internalType: 'int256', name: 'amount1Delta', type: 'int256' },
      { internalType: 'bytes', name: '_data', type: 'bytes' }
    ],
    name: 'uniswapV3SwapCallback',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' }
    ],
    name: 'unwrapWETH9',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amountMinimum', type: 'uint256' }],
    name: 'unwrapWETH9',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' }
    ],
    name: 'unwrapWETH9WithFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountMinimum', type: 'uint256' },
      { internalType: 'uint256', name: 'feeBips', type: 'uint256' },
      { internalType: 'address', name: 'feeRecipient', type: 'address' }
    ],
    name: 'unwrapWETH9WithFee',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'value', type: 'uint256' }],
    name: 'wrapETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { stateMutability: 'payable', type: 'receive' }
]

export const TOKEN_CREATED_EVENT_ABI = [
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { type: 'address', name: 'tokenAddress', indexed: true },
      { type: 'uint256', name: 'lpNftId', indexed: true },
      { type: 'address', name: 'deployer', indexed: true },
      { type: 'string', name: 'name', indexed: false },
      { type: 'string', name: 'symbol', indexed: false },
      { type: 'uint256', name: 'supply', indexed: false },
      { type: 'uint256', name: '_supply', indexed: false },
      { type: 'address', name: 'lockerAddress', indexed: false },
      { type: 'string', name: 'data', indexed: false }
    ]
  }
] as const

export const DEPLOY_TOKEN_ABI = [
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      {
        name: '_tokenCreator',
        type: 'address',
        internalType: 'address'
      },
      { name: '_tokenURI', type: 'string', internalType: 'string' },
      { name: '_name', type: 'string', internalType: 'string' },
      { name: '_symbol', type: 'string', internalType: 'string' },
      { name: '_lockDays', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'payable'
  }
]

export const BONDING_CURVE_TOKEN_CREATED_EVENT_ABI = [
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      {
        name: 'factoryAddress',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'tokenCreator',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'protocolFeeRecipient',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'bondingCurve',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'tokenURI',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'name',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'symbol',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'tokenAddress',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'poolAddress',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  }
]

export const BUY_BONDING_CURVE_TOKENS_ABI = [
  {
    type: 'function',
    name: 'buy',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      {
        name: 'refundRecipient',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'orderReferrer',
        type: 'address',
        internalType: 'address'
      },
      { name: 'comment', type: 'string', internalType: 'string' },
      {
        name: 'expectedMarketType',
        type: 'uint8',
        internalType: 'enum IMemecoin.MarketType'
      },
      {
        name: 'minOrderSize',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'sqrtPriceLimitX96',
        type: 'uint160',
        internalType: 'uint160'
      },
      { name: 'lockDays', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable'
  }
]

export const SELL_BONDING_CURVE_TOKENS_ABI = [
  {
    type: 'function',
    name: 'sell',
    inputs: [
      {
        name: 'tokensToSell',
        type: 'uint256',
        internalType: 'uint256'
      },
      { name: 'recipient', type: 'address', internalType: 'address' },
      {
        name: 'orderReferrer',
        type: 'address',
        internalType: 'address'
      },
      { name: 'comment', type: 'string', internalType: 'string' },
      {
        name: 'expectedMarketType',
        type: 'uint8',
        internalType: 'enum IMemecoin.MarketType'
      },
      {
        name: 'minPayoutSize',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'sqrtPriceLimitX96',
        type: 'uint160',
        internalType: 'uint160'
      }
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable'
  }
]

export const SWAP_ABI = [
  {
    type: 'function',
    name: 'estimateSwap',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct TokenSwapper.SwapParams',
        components: [
          { name: 'tokenIn', type: 'address', internalType: 'address' },
          {
            name: 'tokenOut',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'tokenInPoolType',
            type: 'uint8',
            internalType: 'enum TokenSwapper.TokenPoolType'
          },
          {
            name: 'tokenOutPoolType',
            type: 'uint8',
            internalType: 'enum TokenSwapper.TokenPoolType'
          },
          {
            name: 'recipient',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'amountIn',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'amountOutMinimum',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'orderReferrer',
            type: 'address',
            internalType: 'address'
          },
          { name: 'feeIn', type: 'uint24', internalType: 'uint24' },
          { name: 'feeOut', type: 'uint24', internalType: 'uint24' }
        ]
      }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'swap',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct BondingSwap.SwapParams',
        components: [
          { name: 'tokenIn', type: 'address', internalType: 'address' },
          {
            name: 'tokenOut',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'tokenInPoolType',
            type: 'uint8',
            internalType: 'enum BondingSwap.TokenPoolType'
          },
          {
            name: 'tokenOutPoolType',
            type: 'uint8',
            internalType: 'enum BondingSwap.TokenPoolType'
          },
          {
            name: 'recipient',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'amountIn',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'amountOutMinimum',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'orderReferrer',
            type: 'address',
            internalType: 'address'
          },
          { name: 'feeIn', type: 'uint24', internalType: 'uint24' },
          { name: 'feeOut', type: 'uint24', internalType: 'uint24' }
        ]
      }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable'
  }
]

export const UNISWAP_V2_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' }
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export const UNISWAP_V2_PAIR_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    type: 'function'
  }
]

import { BASE_CHAIN_ID, CapabilitiesSchema } from '@/constants'
import { OnchainData } from '@/types'
import { WalletCapabilities } from 'viem'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureString(value: any, message: string | undefined = undefined): string {
  if (!value) {
    throw new Error(message || 'Value is undefined')
  }
  return value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNull(obj: any): obj is null | undefined {
  return obj === null || obj === undefined
}

export function compactMap<T>(array: (T | null | undefined)[]): T[] {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return array.filter((item) => !isNull(item)) as T[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequiredString(arg: any): arg is string {
  return typeof arg === 'string'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOptionalString(arg: any): arg is string | null | undefined {
  return isNull(arg) || isRequiredString(arg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRequiredNumber(arg: any): arg is number {
  return typeof arg === 'number'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOptionalNumber(arg: any): arg is number | null | undefined {
  return isNull(arg) || isRequiredNumber(arg)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBigInt(value: any): value is bigint {
  return typeof value === 'bigint'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidBigIntString(str: any): boolean {
  try {
    if (!isRequiredString(str)) {
      return false
    }
    BigInt(str)
    return true
  } catch (e) {
    return false
  }
}

export function encodeOnchainData(data: OnchainData): string {
  const separator = '@@@'
  return [
    data.image,
    data.website,
    data.twitter,
    data.telegram,
    data.discord,
    data.description,
    data.farcasterId
  ].join(separator)
}

export function isBatchSupported(
  capabilities: { [x: number]: WalletCapabilities } | undefined
): boolean {
  try {
    const parsedCapabilities = CapabilitiesSchema.parse(capabilities)
    return parsedCapabilities[BASE_CHAIN_ID].atomicBatch.supported
  } catch {
    return false
  }
}

export function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  logError: boolean = true
): Promise<T> {
  return new Promise((resolve, reject) => {
    let retries = 0
    const attempt = (): void => {
      fn()
        .then(resolve)
        .catch((error) => {
          if (logError) {
            console.error(`Error: ${error}`)
          }
          if (retries < maxRetries) {
            retries++
            setTimeout(attempt, 1000)
          } else {
            reject(error)
          }
        })
    }

    attempt()
  })
}

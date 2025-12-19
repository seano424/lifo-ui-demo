/**
 * Currency code to symbol mapping
 * Supports common currencies used in retail/food industry
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  CHF: 'CHF',
  CAD: 'CA$',
  AUD: 'A$',
  NZD: 'NZ$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  HRK: 'kn',
  RUB: '₽',
  TRY: '₺',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  ZAR: 'R',
  KRW: '₩',
  SGD: 'S$',
  HKD: 'HK$',
  THB: '฿',
  MYR: 'RM',
  PHP: '₱',
  IDR: 'Rp',
  VND: '₫',
}

/**
 * Default currency to use when none is configured
 */
export const DEFAULT_CURRENCY = 'EUR'

/**
 * Get currency symbol from currency code
 * Falls back to DEFAULT_CURRENCY if code is not recognized
 *
 * @param currencyCode - ISO 4217 currency code (e.g., 'EUR', 'USD')
 * @returns Currency symbol (e.g., '€', '$')
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) {
    return CURRENCY_SYMBOLS[DEFAULT_CURRENCY]
  }

  const upperCode = currencyCode.toUpperCase()
  return CURRENCY_SYMBOLS[upperCode] || CURRENCY_SYMBOLS[DEFAULT_CURRENCY]
}

/**
 * Format a price with currency symbol
 *
 * @param amount - The price amount
 * @param currencyCode - ISO 4217 currency code
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string with currency symbol (e.g., '€12.50')
 */
export function formatPrice(amount: number, currencyCode?: string | null, decimals = 2): string {
  const symbol = getCurrencySymbol(currencyCode)
  return `${symbol}${amount.toFixed(decimals)}`
}

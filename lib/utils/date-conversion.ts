/**
 * Date conversion utilities for handling various date formats
 * Designed for European date format (dd/mm/yyyy)
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) or timestamp (YYYY-MM-DDTHH:MM:SS) as a local date to avoid timezone issues.
 *
 * When you use `new Date("2026-01-20")`, JavaScript interprets it as UTC midnight,
 * which can display as the previous day in timezones behind UTC (like US timezones).
 *
 * This function parses the date components and creates a Date object in the local timezone,
 * ensuring that "2026-01-20" always displays as January 20, 2026 regardless of timezone.
 *
 * @param dateString - ISO formatted date string (YYYY-MM-DD) or timestamp (YYYY-MM-DDTHH:MM:SS)
 * @returns Date object in local timezone
 *
 * @example
 * // Without this function (UTC interpretation):
 * const date = new Date("2026-01-20") // Shows Jan 19 in US timezones
 *
 * // With this function (local interpretation):
 * const date = parseISODateAsLocal("2026-01-20") // Always shows Jan 20
 * const date2 = parseISODateAsLocal("2026-01-20T14:30:00") // Always shows Jan 20
 */
export function parseISODateAsLocal(dateString: string): Date {
  // Handle both date-only and timestamp formats by extracting just the date portion
  const dateOnly = dateString.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Convert common date formats to ISO yyyy-MM-dd format
 * Supports European (dd/mm/yyyy) date formats:
 * - ISO format: 2025-10-18 (preferred, unambiguous)
 * - European format: dd/mm/yyyy or dd-mm-yyyy (e.g., 31/12/2024)
 * - European format with 2-digit year: dd/mm/yy (e.g., 31/12/24 → 2024)
 *
 * Note: Ambiguous dates like "03/04/2024" are interpreted as European format (3rd April, not March 4th)
 *
 * @param raw - Raw date string from CSV or user input
 * @returns ISO formatted date string (yyyy-MM-dd) or empty string if invalid
 */
export function convertToISODate(raw: string): string {
  if (!raw) return ''
  const s = raw.trim()

  // Already ISO format: 2025-10-18 (unambiguous, preferred format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // European format: dd/mm/yyyy or dd-mm-yyyy
  // Examples: 31/12/2024, 31-12-2024, 1/5/24
  const dmY = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (dmY) {
    const day = Number.parseInt(dmY[1], 10)
    const month = Number.parseInt(dmY[2], 10)
    let year = Number.parseInt(dmY[3], 10)

    // Handle 2-digit years: 24 → 2024
    if (dmY[3].length === 2) {
      year = year + 2000
    }

    // Validate date components (basic validation)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // Additional validation: check if date is actually valid (e.g., no Feb 31st)
      const testDate = new Date(year, month - 1, day)
      if (
        testDate.getFullYear() === year &&
        testDate.getMonth() === month - 1 &&
        testDate.getDate() === day
      ) {
        const paddedMonth = String(month).padStart(2, '0')
        const paddedDay = String(day).padStart(2, '0')
        return `${year}-${paddedMonth}-${paddedDay}`
      }
    }
  }

  // No fallback to new Date() parsing - it's ambiguous and locale-dependent
  // If the date doesn't match expected formats, return empty string
  return ''
}

/**
 * Format an ISO date (yyyy-MM-dd) to European display format (dd/mm/yyyy)
 * @param isoDate - ISO formatted date string (yyyy-MM-dd)
 * @param separator - Separator to use (default: '/')
 * @returns European formatted date string (dd/mm/yyyy) or empty string if invalid
 */
export function formatToEuropeanDate(isoDate: string, separator: string = '/'): string {
  if (!isoDate) return ''

  // Validate ISO format
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''

  const [, year, month, day] = match

  // Remove leading zeros for day and month (European convention)
  const displayDay = Number.parseInt(day, 10).toString()
  const displayMonth = Number.parseInt(month, 10).toString()

  return `${displayDay}${separator}${displayMonth}${separator}${year}`
}

/**
 * Parse raw OCR text that might contain a date
 * Handles various separators and formats commonly seen in OCR
 * @param rawText - Raw text from OCR (e.g., "EXP 31.12.2025" or "31/12/25")
 * @returns ISO formatted date string (yyyy-MM-dd) or null if no date found
 */
export function parseOCRDate(rawText: string): string | null {
  if (!rawText) return null

  const text = rawText.trim()

  // Try to extract date patterns from text
  // Supports: dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy, dd mm yyyy
  // Also supports: dd/mm/yy, dd.mm.yy, etc.
  const datePattern = /(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{2,4})/

  const match = text.match(datePattern)
  if (!match) return null

  const day = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  let year = Number.parseInt(match[3], 10)

  // Handle 2-digit years: 24 → 2024, 99 → 2099
  if (match[3].length === 2) {
    year = year + 2000
  }

  // Validate date components
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  // Additional validation: check if date is actually valid (e.g., no Feb 31st)
  const testDate = new Date(year, month - 1, day)
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return null
  }

  const paddedMonth = String(month).padStart(2, '0')
  const paddedDay = String(day).padStart(2, '0')
  return `${year}-${paddedMonth}-${paddedDay}`
}

/**
 * Validate that a date is realistic for a product expiry date
 * Rejects dates that are:
 * - In the past (expired)
 * - Too far in the future (>10 years)
 * - Invalid dates
 * @param isoDate - ISO formatted date string (yyyy-MM-dd)
 * @returns { valid: boolean, reason?: string }
 */
export function validateExpiryDate(isoDate: string): {
  valid: boolean
  reason?: string
} {
  if (!isoDate) {
    return { valid: false, reason: 'Empty date' }
  }

  // Validate ISO format
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return { valid: false, reason: 'Invalid date format' }
  }

  const dateObj = new Date(isoDate)
  if (Number.isNaN(dateObj.getTime())) {
    return { valid: false, reason: 'Invalid date' }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tenYearsFromNow = new Date(today)
  tenYearsFromNow.setFullYear(today.getFullYear() + 10)

  // Check if date is in the past
  if (dateObj < today) {
    return { valid: false, reason: 'Date is in the past' }
  }

  // Check if date is too far in the future (likely OCR error)
  if (dateObj > tenYearsFromNow) {
    return { valid: false, reason: 'Date is more than 10 years in the future' }
  }

  return { valid: true }
}

/**
 * Parse and validate a date from OCR with confidence assessment
 * Combines parsing, validation, and provides a confidence score
 * @param rawText - Raw text from OCR
 * @param ocrConfidence - Confidence score from OCR API (0-1)
 * @returns Object with parsed date, validation status, and adjusted confidence
 */
export function parseAndValidateOCRDate(
  rawText: string,
  ocrConfidence: number,
): {
  isoDate: string | null
  europeanDate: string | null
  valid: boolean
  confidence: number
  validationError?: string
} {
  // Try to parse the date
  const isoDate = parseOCRDate(rawText)

  if (!isoDate) {
    return {
      isoDate: null,
      europeanDate: null,
      valid: false,
      confidence: 0,
      validationError: 'No date pattern found in OCR text',
    }
  }

  // Validate the parsed date
  const validation = validateExpiryDate(isoDate)

  if (!validation.valid) {
    return {
      isoDate,
      europeanDate: formatToEuropeanDate(isoDate),
      valid: false,
      confidence: ocrConfidence * 0.5, // Reduce confidence for invalid dates
      validationError: validation.reason,
    }
  }

  // Date is valid - return with full confidence
  return {
    isoDate,
    europeanDate: formatToEuropeanDate(isoDate),
    valid: true,
    confidence: ocrConfidence,
  }
}

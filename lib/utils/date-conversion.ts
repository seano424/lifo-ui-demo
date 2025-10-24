/**
 * Date conversion utilities for handling various date formats
 * Designed for European date format (dd/mm/yyyy)
 */

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

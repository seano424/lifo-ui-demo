/**
 * Utility function to generate stable, unique keys for skeleton components
 * This prevents React linting warnings about using array indices as keys
 */

export function createSkeletonKeys(
  count: number,
  prefix: string = 'skeleton',
): Array<{ id: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    label: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} ${i + 1}`,
  }))
}

/**
 * Alternative function for simple skeleton arrays
 */
export function createSimpleSkeletonKeys(count: number, prefix: string = 'skeleton'): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`)
}

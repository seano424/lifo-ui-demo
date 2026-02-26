/**
 * Normalises a product name for display by replacing " - " separators with a space.
 * Product names stored in the DB can include brand/variant separators like
 * "Brand - Variant Name" which are stripped for a cleaner UI label.
 */
export function formatProductName(name: string | null | undefined): string {
  return name?.replace(/ - /g, ' ') ?? ''
}

/**
 * Maps a food category name to an emoji icon and a background colour hex.
 * Used in the onboarding flow (Step 5 shelf-life list, Step 6 review chips).
 */
export function getCategoryEmoji(name: string): { emoji: string; bg: string } {
  const n = name.toLowerCase()

  if (n.includes('beverage')) return { emoji: '🥤', bg: '#dbeafe' }
  if (n.includes('butter') || n.includes('spread')) return { emoji: '🧈', bg: '#fef3c7' }
  if (n.includes('canned') || n.includes('jarred')) return { emoji: '🥫', bg: '#e0e7ff' }
  if (n.includes('cheese')) return { emoji: '🧀', bg: '#fef9c3' }
  if (n.includes('chilled')) return { emoji: '❄️', bg: '#cffafe' }
  if (n.includes('dairy') || n.includes('egg')) return { emoji: '🥛', bg: '#fce7f3' }
  if (n.includes('deli') || n.includes('prepared')) return { emoji: '🥩', bg: '#fee2e2' }
  if (n.includes('dry') || n.includes('grain')) return { emoji: '🫘', bg: '#f3e8ff' }
  if (n.includes('bak')) return { emoji: '🍞', bg: '#ffedd5' }
  if (n.includes('fish')) return { emoji: '🐟', bg: '#ccfbf1' }
  if (n.includes('herb') || n.includes('aromatic')) return { emoji: '🌿', bg: '#d1fae5' }
  if (n.includes('meat')) return { emoji: '🥩', bg: '#ffe4e6' }

  return { emoji: '📦', bg: '#f3f4f6' }
}

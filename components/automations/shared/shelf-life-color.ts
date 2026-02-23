export function getShelfLifeColor(days: number): string {
  if (days <= 5) return 'var(--ob-red)'
  if (days <= 14) return 'var(--ob-amber)'
  if (days <= 30) return 'var(--ob-green)'
  return 'var(--ob-text-muted)'
}

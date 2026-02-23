export function getShelfLifeColor(days: number): string {
  if (days <= 5) return '#ef4444'
  if (days <= 14) return '#f59e0b'
  if (days <= 30) return 'hsl(252 100% 57%)'
  return 'var(--muted-foreground)'
}

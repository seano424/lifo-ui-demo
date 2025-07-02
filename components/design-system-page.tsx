import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Palette, Type, Grid, Layers } from 'lucide-react'

export default function DesignSystemPage() {
  const brandColors = [
    {
      name: 'Brand Dark',
      value: 'hsl(225, 42%, 8%)',
      cssVar: '--color-brand-dark',
      hex: '#0f1629',
      usage: 'Primary text, logos, headers',
    },
    {
      name: 'Brand White',
      value: 'hsl(0, 0%, 100%)',
      cssVar: '--color-brand-white',
      hex: '#ffffff',
      usage: 'Background, inverted text',
    },
    {
      name: 'Brand Primary',
      value: 'hsl(263, 82%, 45%)',
      cssVar: '--color-brand-primary',
      hex: '#6c1ed9',
      usage: 'Primary actions, CTAs, links',
    },
    {
      name: 'Brand Secondary',
      value: 'hsl(207, 87%, 54%)',
      cssVar: '--color-brand-secondary',
      hex: '#1c86ee',
      usage: 'Secondary actions, accents',
    },
  ]

  const systemColors = [
    {
      name: 'Background',
      value: '',
      hex: '',
      cssVar: 'background',
      usage: 'Main page background',
    },
    {
      name: 'Foreground',
      value: '',
      hex: '',
      cssVar: 'foreground',
      usage: 'Primary text color',
    },
    {
      name: 'Primary',
      value: '',
      hex: '',
      cssVar: 'primary',
      usage: 'Primary buttons and actions',
    },
    {
      name: 'Secondary',
      value: '',
      hex: '',
      cssVar: 'secondary',
      usage: 'Secondary buttons',
    },
    {
      name: 'Muted',
      value: '',
      hex: '',
      cssVar: 'muted',
      usage: 'Subtle backgrounds',
    },
    {
      name: 'Accent',
      value: '',
      hex: '',
      cssVar: 'accent',
      usage: 'Hover states and highlights',
    },
    {
      name: 'Destructive',
      value: '',
      hex: '',
      cssVar: 'destructive',
      usage: 'Error states and deletion',
    },
    {
      name: 'Border',
      value: '',
      hex: '',
      cssVar: 'border',
      usage: 'Component borders',
    },
    {
      name: 'Input',
      value: '',
      hex: '',
      cssVar: 'input',
      usage: 'Form input backgrounds',
    },
    {
      name: 'Ring',
      value: '',
      hex: '',
      cssVar: 'ring',
      usage: 'Focus rings',
    },
  ]

  const ColorSwatch = ({
    color,
    showHex = false,
  }: {
    color: { name: string; value: string; cssVar: string; hex: string; usage: string }
    showHex: boolean
  }) => (
    <div className="space-y-3">
      <div
        className="w-full h-24 rounded-lg border shadow-sm"
        style={{ backgroundColor: showHex ? color.hex : `hsl(var(--${color.cssVar}))` }}
      />
      <div className="space-y-1">
        <h4 className="font-medium text-sm">{color.name}</h4>
        {showHex && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-mono">{color.value}</p>
            <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{color.usage}</p>
        <Badge variant="outline" className="text-xs font-mono">
          {showHex ? color.cssVar : `--${color.cssVar}`}
        </Badge>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">LIFO Design System</h1>
        <p className="text-lg text-muted-foreground">
          Visual design foundation for consistent UI across the LIFO platform
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 flex-wrap">
        <Button variant="outline" size="sm">
          <Palette className="w-4 h-4 mr-2" />
          Colors
        </Button>
        <Button variant="ghost" size="sm" disabled>
          <Type className="w-4 h-4 mr-2" />
          Typography (Coming Soon)
        </Button>
        <Button variant="ghost" size="sm" disabled>
          <Grid className="w-4 h-4 mr-2" />
          Spacing (Coming Soon)
        </Button>
        <Button variant="ghost" size="sm" disabled>
          <Layers className="w-4 h-4 mr-2" />
          Components (Coming Soon)
        </Button>
      </div>

      {/* Brand Colors */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Brand Colors</h2>
          <p className="text-muted-foreground">
            Core brand colors that define LIFO&apos;s visual identity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {brandColors.map(color => (
            <ColorSwatch key={color.name} color={color} showHex={true} />
          ))}
        </div>
      </section>

      {/* System Colors */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">System Colors</h2>
          <p className="text-muted-foreground">
            Semantic colors that adapt automatically between light and dark modes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {systemColors.map(color => (
            <ColorSwatch key={color.name} color={color} showHex={true} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Design System v1.0 • Last updated: January 2025 •
          <a href="#" className="text-primary hover:underline ml-1">
            View in Figma
          </a>
        </p>
      </footer>
    </div>
  )
}

'use client'

import { DotPattern, GradientGrid, WavePattern } from '@/components/ui/grid-background'
import { RevealAnimation } from '@/components/ui/reveal-animation'
import React from 'react'

interface SectionWithBackgroundProps {
  children: React.ReactNode
  variant?: 'dots' | 'grid' | 'wave'
  className?: string
}

export function SectionWithBackground({
  children,
  variant = 'dots',
  className = '',
}: SectionWithBackgroundProps) {
  return (
    <div className={`relative overflow-hidden py-16 ${className}`}>
      {variant === 'dots' && <DotPattern dotColor="#94A3B8" dotOpacity={0.3} gridSize={25} />}
      {variant === 'grid' && (
        <GradientGrid
          startColor="rgba(59, 130, 246, 0.1)"
          endColor="rgba(16, 185, 129, 0.1)"
          gridSize={40}
        />
      )}
      {variant === 'wave' && <WavePattern waveColor="#3B82F6" waveOpacity={0.05} />}

      <div className="relative z-10">{children}</div>
    </div>
  )
}

// Exemple d'utilisation :
export function SectionWithGridExample() {
  return (
    <SectionWithBackground variant="grid" className="py-24 bg-gradient-to-b from-white to-blue-50">
      <div className="container mx-auto px-4">
        <RevealAnimation>
          <h2 className="text-3xl font-bold text-center mb-12">
            Section avec arrière-plan en grille
          </h2>
        </RevealAnimation>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contenu de la section ici */}
        </div>
      </div>
    </SectionWithBackground>
  )
}

export function SectionWithDotsExample() {
  return (
    <SectionWithBackground variant="dots" className="py-24 bg-indigo-50">
      <div className="container mx-auto px-4">
        <RevealAnimation>
          <h2 className="text-3xl font-bold text-center mb-12">Section avec motif de points</h2>
        </RevealAnimation>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contenu de la section ici */}
        </div>
      </div>
    </SectionWithBackground>
  )
}

export function SectionWithWaveExample() {
  return (
    <SectionWithBackground variant="wave" className="py-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 text-center">
        <RevealAnimation>
          <h2 className="text-3xl font-bold mb-8">Section avec effet de vague</h2>
        </RevealAnimation>
        <div className="max-w-3xl mx-auto">{/* Contenu de la section ici */}</div>
      </div>
    </SectionWithBackground>
  )
}

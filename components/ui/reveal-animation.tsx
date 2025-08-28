'use client'

import { motion, useAnimation, useInView } from 'framer-motion'
import { type ReactNode, useEffect, useRef } from 'react'

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none'

interface RevealProps {
  children: ReactNode
  width?: 'full' | 'auto'
  direction?: RevealDirection
  delay?: number
  duration?: number
  once?: boolean
  className?: string
}

export function RevealAnimation({
  children,
  width = 'full',
  direction = 'up',
  delay = 0,
  duration = 0.5,
  once = true,
  className = '',
}: RevealProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-100px 0px' })

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else if (!once) {
      controls.start('hidden')
    }
  }, [controls, isInView, once])

  // Define variants based on direction
  const getHiddenVariant = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 50 }
      case 'down':
        return { opacity: 0, y: -50 }
      case 'left':
        return { opacity: 0, x: 50 }
      case 'right':
        return { opacity: 0, x: -50 }
      case 'none':
        return { opacity: 0 }
      default:
        return { opacity: 0, y: 50 }
    }
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      <motion.div
        ref={ref}
        className={`${width === 'full' ? 'w-full' : ''} ${className}`}
        initial={getHiddenVariant()}
        animate={controls}
        variants={{
          visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
              type: 'spring',
              damping: 25,
              stiffness: 100,
            },
          },
        }}
        transition={{
          duration,
          delay,
          ease: [0.25, 0.1, 0.25, 1.0], // Cubic bezier easing
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

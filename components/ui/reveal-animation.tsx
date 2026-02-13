'use client'

import { motion, useAnimation, useInView } from 'framer-motion'
import { type ReactNode, memo, useEffect, useMemo, useRef } from 'react'

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

// Define variants outside component to prevent recreation
const getHiddenVariant = (direction: RevealDirection) => {
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

const visibleVariants = {
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 100,
    },
  },
}

const containerStyle = { overflow: 'hidden' }

export const RevealAnimation = memo(function RevealAnimation({
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

  const hiddenVariant = useMemo(() => getHiddenVariant(direction), [direction])

  const transition = useMemo(
    () => ({
      duration,
      delay,
      ease: [0.25, 0.1, 0.25, 1.0] as const,
    }),
    [duration, delay],
  )

  return (
    <div style={containerStyle}>
      <motion.div
        ref={ref}
        className={`${width === 'full' ? 'w-full' : ''} ${className}`}
        initial={hiddenVariant}
        animate={controls}
        variants={visibleVariants}
        transition={transition}
      >
        {children}
      </motion.div>
    </div>
  )
})

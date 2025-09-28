const isDevelopment = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'

export const logger = {
  log: (context: string, message: string, ...args: unknown[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(`[${context}] ${message}`, ...args)
    }
  },
  error: (context: string, message: string, ...args: unknown[]) => {
    console.error(`[${context}] ${message}`, ...args)
  },
  warn: (context: string, message: string, ...args: unknown[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.warn(`[${context}] ${message}`, ...args)
    }
  },
}

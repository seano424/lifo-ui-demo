'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA Install Prompt Component
 *
 * This component provides a custom install prompt for the Progressive Web App.
 * It offers a branded alternative to the browser's native install prompt.
 *
 * WHAT IT DOES:
 * - Shows a custom install prompt when the browser supports PWA installation
 * - Manages user interaction with install/dismiss actions
 * - Implements a 5-minute cooldown to prevent spam
 * - Detects when the app is already installed
 *
 * NOTE: Service worker registration is handled separately by ServiceWorkerRegistrar component
 */

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if we should show the prompt (wait 5 minutes between prompts)
    const shouldShowPrompt = () => {
      const lastPromptTime = localStorage.getItem('pwa-prompt-time')
      if (!lastPromptTime) return true

      const timeDiff = Date.now() - parseInt(lastPromptTime, 10)
      const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
      return timeDiff > fiveMinutes
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt fired')
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Only show if enough time has passed
      if (shouldShowPrompt()) {
        setShowInstallPrompt(true)
      }
    }

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice

      console.log(`User ${outcome} the install prompt`)

      // Clear the deferredPrompt
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
      // Record the time when user attempted installation
      localStorage.setItem('pwa-prompt-time', Date.now().toString())
    } catch (error) {
      console.error('Error during installation:', error)
      // Still record the time even if installation failed
      localStorage.setItem('pwa-prompt-time', Date.now().toString())
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Record the time when user dismissed to prevent showing again for 5 minutes
    localStorage.setItem('pwa-prompt-time', Date.now().toString())
    // Don't clear deferredPrompt, user might want to install later
  }

  // Don't show anything if already installed or not installable
  if (isInstalled || !showInstallPrompt) return null

  return (
    <>
      {/* Mobile Banner Style - Bottom */}
      <div className="fixed bottom-2 left-2 right-2 bg-blue-600 text-white p-2 rounded-lg shadow-lg z-50 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Image
                src="/logos/lifo-logo-icon.svg"
                alt="LIFO"
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </div>
            <div>
              <p className="font-medium text-xs">Install LIFO</p>
              <p className="text-blue-100 text-xs">Experimental PWA</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-white text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 hover:bg-blue-700 rounded"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Floating Button - Compact */}
      <div className="fixed bottom-4 right-4 z-50 hidden md:block">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0">
              <Image
                src="/logos/LIFO-Logo-dark-BG.png"
                alt="LIFO"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-xs">Install LIFO</h3>
              <p className="text-gray-500 text-xs">Experimental PWA</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

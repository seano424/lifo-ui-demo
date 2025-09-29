'use client'

import { useEffect } from 'react'
import { Toaster as SonnerToaster, type ToasterProps, toast } from 'sonner'

interface CustomToasterProps extends ToasterProps {
  closeOnClickOutside?: boolean
}

export function Toaster({ closeOnClickOutside = false, ...props }: CustomToasterProps) {
  useEffect(() => {
    if (!closeOnClickOutside) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element

      // Check if the click is outside any toast
      const toastElements = document.querySelectorAll('[data-sonner-toast]')
      const isClickInsideToast = Array.from(toastElements).some(toastEl => toastEl.contains(target))

      // Check if click is on the toaster container itself
      const toasterContainer = document.querySelector('[data-sonner-toaster]')
      const isClickOnToaster = toasterContainer?.contains(target)

      // If click is outside all toasts but not on the toaster container, dismiss all toasts
      if (!isClickInsideToast && !isClickOnToaster) {
        toast.dismiss()
      }
    }

    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [closeOnClickOutside])

  return <SonnerToaster {...props} />
}

// Global type definitions for custom events and window extensions

interface WindowEventMap {
  cookieConsentAccepted: CustomEvent
  cookieConsentRevoked: CustomEvent
}

// Extend the Window interface to include our custom events
declare global {
  interface Window {
    addEventListener<K extends keyof WindowEventMap>(
      type: K,
      listener: (this: Window, ev: WindowEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions,
    ): void
    removeEventListener<K extends keyof WindowEventMap>(
      type: K,
      listener: (this: Window, ev: WindowEventMap[K]) => void,
      options?: boolean | EventListenerOptions,
    ): void
    dispatchEvent(event: Event): boolean
  }
}

export {}

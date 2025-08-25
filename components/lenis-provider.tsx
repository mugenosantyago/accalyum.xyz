"use client"

import { useEffect } from 'react'

interface LenisProviderProps {
  children: React.ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return
    }

    let lenisInstance: any = null
    let rafId: number | null = null

    // Create a function to initialize Lenis
    const initSmoothScroll = async () => {
      try {
        // Dynamically import Lenis only on client side
        const LenisModule = await import('lenis')
        const Lenis = LenisModule.default || LenisModule

        // Create Lenis instance
        lenisInstance = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          direction: 'vertical',
          gestureDirection: 'vertical',
          smooth: true,
          mouseMultiplier: 1,
          smoothTouch: false,
          touchMultiplier: 2,
          infinite: false,
        })

        // Update scroll position
        const raf = (time: number) => {
          lenisInstance.raf(time)
          rafId = window.requestAnimationFrame(raf)
        }

        rafId = window.requestAnimationFrame(raf)
      } catch (error) {
        // Fail silently in production, log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('Lenis initialization failed:', error)
        }
      }
    }

    // Initialize after a small delay to ensure DOM is ready
    const timeoutId = setTimeout(initSmoothScroll, 0)

    // Cleanup function
    return () => {
      clearTimeout(timeoutId)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      if (lenisInstance) {
        lenisInstance.destroy()
      }
    }
  }, [])

  return <>{children}</>
}

"use client"

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

interface LenisProviderProps {
  children: React.ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<any>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    let lenis: any
    let rafId: number

    // Dynamically import Lenis to avoid SSR issues
    import('lenis').then(({ default: Lenis }) => {
      // Initialize Lenis
      lenis = new Lenis({
        duration: 1.2, // Duration of the scroll animation
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
        direction: 'vertical', // Vertical scroll
        gestureDirection: 'vertical', // Vertical gesture direction
        smooth: true,
        mouseMultiplier: 1, // Mouse scroll multiplier
        smoothTouch: false, // Disable smooth scroll on touch devices for better mobile experience
        touchMultiplier: 2, // Touch scroll multiplier
        infinite: false, // Infinite scroll
      })

      lenisRef.current = lenis

      // Animation frame loop
      function raf(time: number) {
        lenis.raf(time)
        rafId = requestAnimationFrame(raf)
      }

      rafId = requestAnimationFrame(raf)
    })

    // Cleanup function
    return () => {
      if (lenis) {
        cancelAnimationFrame(rafId)
        lenis.destroy()
        lenisRef.current = null
      }
    }
  }, [])

  return <>{children}</>
}

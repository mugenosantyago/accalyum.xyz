"use client"

import { useEffect, useLayoutEffect, useRef } from 'react'
import Lenis from 'lenis'

interface LenisProviderProps {
  children: React.ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null)

  // Use useLayoutEffect on client, useEffect on server
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

  useIsomorphicLayoutEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2, // Duration of the scroll animation
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing function
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
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Cleanup
    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return <>{children}</>
}

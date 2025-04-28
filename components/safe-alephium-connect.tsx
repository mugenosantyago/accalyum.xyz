"use client"

import type React from "react"

import { useEffect, useState } from "react"

// This component safely wraps any component that uses AlephiumConnect hooks
export function SafeAlephiumConnect({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Only render children on the client side
  if (!isMounted) {
    return null
  }

  return <>{children}</>
}

// Use this function to safely check if we're in a browser environment
export function isBrowser() {
  return typeof window !== "undefined"
}

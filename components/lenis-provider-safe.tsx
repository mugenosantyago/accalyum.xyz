"use client"

interface LenisProviderProps {
  children: React.ReactNode
}

// Temporary safe version that doesn't use Lenis
// Replace with lenis-provider.tsx when deployment issues are resolved
export function LenisProvider({ children }: LenisProviderProps) {
  return <>{children}</>
}

"use client"

import type React from "react"

// This is now just a passthrough component since we're using the provider in layout.tsx
export default function AlephiumConnectProviderWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

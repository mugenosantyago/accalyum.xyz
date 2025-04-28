"use client"

import type React from "react"

import { ClientLayoutWrapper } from "./client-layout-wrapper"

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
}

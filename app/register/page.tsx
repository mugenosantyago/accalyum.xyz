"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegisterRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the ID registration page
    router.push("/id-registration")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Redirecting to registration page...</p>
    </div>
  )
}

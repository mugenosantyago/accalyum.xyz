import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Just pass through all requests
  return NextResponse.next()
}

// Configure to run on specific paths only
export const config = {
  matcher: [
    // Skip all internal paths (_next, api, etc)
    "/((?!_next/|_vercel|api/).*)",
  ],
}

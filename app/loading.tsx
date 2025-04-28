import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF6B35]" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

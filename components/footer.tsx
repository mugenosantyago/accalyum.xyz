import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer
      className="bg-black/80 backdrop-blur-md border-t border-gray-800 text-white py-12 mt-auto"
      role="contentinfo"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#FF6B35]/30">
              <Image src="/images/logo.png" alt="" fill className="object-cover" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold gradient-text">YUM</h2>
          </div>

          <div className="flex space-x-8">
            <Link href="/admin" className="text-gray-400 hover:text-[#FF6B35] transition-colors">
              Admin
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-[#FF6B35] transition-colors">
              Contact
            </Link>
            <Link href="/privacy-policy" className="text-gray-400 hover:text-[#FF6B35] transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} YUM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

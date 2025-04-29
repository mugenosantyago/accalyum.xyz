"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Home,
  BadgeIcon as IdCard,
  Landmark,
  BarChart3,
  HeartHandshake,
  Coins,
  History,
  Menu,
  X,
  Globe,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { siteConfig } from "@/lib/config"

export function ModernNav() {
  const pathname = usePathname()
  const { t, language, toggleLanguage } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { href: "/", icon: <Home size={20} />, label: t("home") },
    { href: "/id-registration", icon: <IdCard size={20} />, label: t("idRegistration") },
    { href: "/acyum-bank", icon: <Landmark size={20} />, label: t("acyumBank") },
    { href: "/trade-tokens", icon: <BarChart3 size={20} />, label: t("tradeTokens") },
    { href: "/mutual-funding", icon: <HeartHandshake size={20} />, label: t("mutualFunding") },
    { href: "/tokens", icon: <Coins size={20} />, label: t("tokens") },
    { href: "/transactions", icon: <History size={20} />, label: t("transactions") },
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-black/80 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#FF6B35]/50 glow">
              <Image src="/images/logo.png" alt="ACYUM" fill className="object-cover" />
            </div>
            {/* Hide text on mobile, show on md and up */}
            <span className="font-bold text-2xl gradient-text hidden md:block">ACYUM</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleLanguage}
              className="nav-button group"
              aria-label={language === "en" ? "Switch to Japanese" : "Switch to English"}
            >
              <Globe className="icon" size={20} />
              <span className="label">{language === "en" ? "JP" : "EN"}</span>
            </button>

            <WalletConnectDisplay />

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="nav-button group md:hidden"
              aria-label="Open menu"
            >
              <Menu className="icon" size={20} />
              <span className="label">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Side Navigation (Desktop) */}
      <nav className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden md:flex flex-col gap-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="group">
              <div className={`nav-button ${isActive ? "bg-[#FF6B35] border-[#FF6B35]" : ""}`}>
                <div className={`icon ${isActive ? "text-white" : ""}`}>{item.icon}</div>
                <span className="label">{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-gray-900 border-l border-gray-800 flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-800">
                <h2 className="text-xl font-bold gradient-text">ACYUM</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="flex flex-col gap-2 px-4">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          isActive
                            ? "bg-[#FF6B35] text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-2 p-3 w-full rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <Globe size={20} />
                  <span>{language === "en" ? t("switchToJapanese") : t("switchToEnglish")}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { Menu, X, Globe } from "lucide-react"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t, language, toggleLanguage } = useLanguage()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="bg-black border-b border-gray-800 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2" aria-label="ACYUM Home">
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <Image src="/images/logo.png" alt="" fill className="object-cover" aria-hidden="true" />
          </div>
          {/* Hide text on mobile, show on md and up */}
          <span className="font-bold text-xl text-[#FF6B35] hidden md:block">ACYUM</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6" aria-label="Main navigation">
          <Link href="/" className="text-gray-300 hover:text-[#FF6B35]">
            {t("home")}
          </Link>
          <Link href="/id-registration" className="text-gray-300 hover:text-[#FF6B35]">
            {t("idRegistration")}
          </Link>
          <Link href="/acyum-bank" className="text-gray-300 hover:text-[#FF6B35]">
            {t("acyumBank")}
          </Link>
          <Link href="/acyum-swap" className="text-gray-300 hover:text-[#FF6B35]">
            {t("tradeTokens")}
          </Link>
          <Link href="/mutual-funding" className="text-gray-300 hover:text-[#FF6B35]">
            {t("mutualFunding")}
          </Link>
          <Link href="/bank" className="text-gray-300 hover:text-[#FF6B35]">
            Bank
          </Link>
          <Link href="/transactions" className="text-gray-300 hover:text-[#FF6B35]">
            {t("transactions")}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-gray-300 hover:text-[#FF6B35]"
            onClick={toggleLanguage}
            aria-label={language === "en" ? "Switch to Japanese" : "Switch to English"}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            <span>{language === "en" ? t("switchToJapanese") : t("switchToEnglish")}</span>
          </Button>
          <WalletConnectDisplay />
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-gray-300 hover:text-[#FF6B35]"
            onClick={toggleLanguage}
            aria-label={language === "en" ? "Switch to Japanese" : "Switch to English"}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
          </Button>
          <WalletConnectDisplay />
          <button
            onClick={toggleMenu}
            className="text-gray-300 hover:text-[#FF6B35] ml-2"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden bg-black border-t border-gray-800 py-4 px-4"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col space-y-3">
            <Link href="/" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("home")}
            </Link>
            <Link href="/id-registration" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("idRegistration")}
            </Link>
            <Link href="/acyum-bank" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("acyumBank")}
            </Link>
            <Link href="/acyum-swap" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("tradeTokens")}
            </Link>
            <Link href="/mutual-funding" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("mutualFunding")}
            </Link>
            <Link href="/bank" className="text-gray-300 hover:text-[#FF6B35] py-2">
              Bank
            </Link>
            <Link href="/transactions" className="text-gray-300 hover:text-[#FF6B35] py-2">
              {t("transactions")}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 justify-start text-gray-300 hover:text-[#FF6B35]"
              onClick={toggleLanguage}
              aria-label={language === "en" ? "Switch to Japanese" : "Switch to English"}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>{language === "en" ? t("switchToJapanese") : t("switchToEnglish")}</span>
            </Button>
          </div>
        </nav>
      )}
    </header>
  )
}

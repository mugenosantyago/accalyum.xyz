"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { HeroLogo } from "./hero-logo"

export function HeroSection() {
  const { t } = useLanguage()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  }

  return (
    <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-bg.jpg"
          alt="Decorative dragon background"
          fill
          priority
          className="object-cover opacity-60"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <HeroLogo />
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-6 gradient-text glow-text leading-tight break-words overflow-hidden"
          >
            {t("welcomeToAccalyum")}
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl md:text-2xl mb-10 text-gray-300">
            {t("communityDriven")}
          </motion.p>

          <motion.div variants={itemVariants}>
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-[#FF6B35] text-white font-medium text-lg hover:bg-[#E85A2A] transition-all duration-300 group"
            >
              {t("registerNow")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}

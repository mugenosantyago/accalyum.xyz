"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, Zap, Clock } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { HeroLogo } from "./hero-logo"
import { Badge } from "@/components/ui/badge"

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

          <motion.p variants={itemVariants} className="text-xl md:text-2xl mb-6 text-gray-300">
            {t("communityDriven")}
          </motion.p>

          <motion.div variants={itemVariants} className="mb-10">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-gray-200">8s Block Times</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-200">20k+ TPS</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-gray-200">🔗 Groupless Addresses</span>
              </div>
            </div>
          </motion.div>

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

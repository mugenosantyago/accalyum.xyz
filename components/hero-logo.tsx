"use client"

import Image from "next/image"
import { motion } from "framer-motion"

export function HeroLogo() {
  return (
    <motion.div
      className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-[#FFD700] glow"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.2,
      }}
    >
      <Image src="/images/logo.png" alt="ACYUM Logo" fill className="object-cover" />
    </motion.div>
  )
}

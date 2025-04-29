import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import type { Metadata } from 'next'

// Add metadata for the homepage
export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to ACYUM, your portal to decentralized finance features like token swapping, banking, and mutual funding on the Alephium blockchain.',
};

export default function Home() {
  return (
    <ClientLayoutWrapper>
      <div className="flex flex-col">
        <HeroSection />
        <AboutSection />
      </div>
    </ClientLayoutWrapper>
  )
}

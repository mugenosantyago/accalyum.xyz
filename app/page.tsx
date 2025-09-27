import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import { DanubeFeatures } from "@/components/danube-features"
import type { Metadata } from 'next'

// Add metadata for the homepage
export const metadata: Metadata = {
  title: 'Home - Danube Enhanced',
  description: 'Experience YUM on Alephium\'s Danube upgrade: 8-second blocks, 20k+ TPS, groupless addresses, and seamless DeFi with revolutionary blockchain technology.',
};

export default function Home() {
  return (
    <ClientLayoutWrapper>
      <div className="flex flex-col">
        <HeroSection />
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <DanubeFeatures />
          </div>
        </section>
        <AboutSection />
        <section className="py-8 px-4 text-center">
          <h3 className="text-xl font-semibold mb-2">Discover Alephi Online</h3>
          <p className="text-md text-muted-foreground mb-4">
            A cryptographic socialist media platform built on Alephium and Irys - now with Danube features.
          </p>
          <a
            href="https://alephi.online"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Visit alephi.online
          </a>
        </section>
      </div>
    </ClientLayoutWrapper>
  )
}

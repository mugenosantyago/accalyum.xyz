import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"
import type { Metadata } from 'next'

// Add metadata for the homepage
export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to YUM, your portal to decentralized finance features like token swapping, banking, and mutual funding on the Alephium blockchain.',
};

export default function Home() {
  return (
    <ClientLayoutWrapper>
      <div className="flex flex-col">
        <HeroSection />
        <AboutSection />
        <section className="py-8 px-4 text-center">
          <h3 className="text-xl font-semibold mb-2">Discover Alephi Online</h3>
          <p className="text-md text-muted-foreground mb-4">
            A cryptographic socialist media platform built on Alephium and Irys.
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

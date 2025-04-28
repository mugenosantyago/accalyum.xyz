import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { HeroSection } from "@/components/hero-section"
import { AboutSection } from "@/components/about-section"

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

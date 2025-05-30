import type { Metadata } from 'next'
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { SweaInfo } from './swea-info'
import { SweaClaim } from './swea-claim'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { SweaVoteForm } from './SweaVoteForm'

// Add metadata for the sWEA page
export const metadata: Metadata = {
  title: 'sWEA Mechanics & Claim',
  description: 'Learn about sWEA mechanics, claim your initial distribution, and purchase more using ALPH.',
  keywords: ['Alephium', 'sWEA', 'Sacagawea Coin', 'Tokenomics', 'Claim', 'Purchase', 'Fair Distribution', 'Community Treasury', 'Governance', 'Crypto', 'DeFi'],
};

// Server Component Page
export default function SweaPage() {
  return (
    <ClientLayoutWrapper> 
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <div className="flex justify-center mb-10">
            <Image 
              src="/IMG_5086_Original.jpg" 
              alt="sWEA Logo Large"
              width={128}
              height={128}
              className="rounded-full border-2 border-[#FF6B35]/50 shadow-lg"
              priority
            />
          </div>

          <SweaInfo />
          
          <Separator className="my-12 bg-gradient-to-r from-transparent via-purple-600/50 to-transparent h-[1px]" />
          
          <SweaClaim />

          <Separator className="my-12 bg-gradient-to-r from-transparent via-orange-600/50 to-transparent h-[1px]" />

          <SweaVoteForm />

          {/* TODO: Add sWEA Bank section later */}

        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 
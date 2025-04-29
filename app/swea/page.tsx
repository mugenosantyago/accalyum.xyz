import type { Metadata } from 'next'
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { SweaInfo } from './swea-info'
import { SweaSwap } from './swea-swap'
import { Separator } from '@/components/ui/separator'

// Add metadata for the sWEA page
export const metadata: Metadata = {
  title: 'sWEA Mechanics',
  description: 'Learn about the unique principles and mechanics of the sWEA (Sacagawea Coin) token on Alephium, focusing on fair distribution and community ownership.',
  keywords: ['Alephium', 'sWEA', 'Sacagawea Coin', 'Tokenomics', 'Fair Distribution', 'Community Treasury', 'Governance', 'Crypto', 'DeFi'],
};

// Server Component Page
export default function SweaPage() {
  return (
    <ClientLayoutWrapper> 
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <SweaInfo />
          
          <Separator className="my-12 bg-gray-700" />
          
          <SweaSwap />
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 
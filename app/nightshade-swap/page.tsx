import type { Metadata } from 'next'
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"

// Add metadata for the Nightshade Swap page
export const metadata: Metadata = {
  title: 'Nightshade Finance Swap - YUM', // Updated title
  description: 'Swap ALPH and YUM tokens directly on Nightshade Finance.', // Updated description
  keywords: ['Alephium', 'YUM', 'Swap', 'Exchange', 'Token', 'ALPH', 'DeFi', 'Crypto', 'Nightshade Finance'],
};

// Client Component Page (to use useLanguage hook)
export default function NightshadeSwapPage() {
  return (
    <ClientLayoutWrapper>
      {/* Removed ClientLayoutWrapper to make it a standalone page */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <a href="https://nightshade.finance/swap?token=YUM&action=buy" target="_blank" rel="noopener noreferrer">
          <button className="w-64 h-64 text-xl font-semibold text-white bg-black rounded-lg shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-transform transform hover:scale-105">
            Go to Nightshade Swap
        </button>
      </a>
    </div>
    </ClientLayoutWrapper>
  );
}

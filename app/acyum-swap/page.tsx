import type { Metadata } from 'next'

// Add metadata for the acyumSwap page
export const metadata: Metadata = {
  title: 'ACYUM Swap - Nightshade Finance', // Uses template: "ACYUM Swap - Nightshade Finance | ACYUM"
  description: 'Swap ALPH and ACYUM tokens on Nightshade Finance.',
  keywords: ['Alephium', 'ACYUM', 'Swap', 'Exchange', 'Token', 'ALPH', 'DeFi', 'Crypto', 'Nightshade Finance'],
};

// Server Component Page
export default function AcyumSwapPage() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))]">
      <a href="https://nightshade.finance/swap?token=ACYUM&action=buy" target="_blank" rel="noopener noreferrer">
        <button className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
          Go to Nightshade Finance Swap
        </button>
      </a>
    </div>
  );
}

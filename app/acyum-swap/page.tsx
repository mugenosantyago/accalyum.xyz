import type { Metadata } from 'next'
import AcyumSwapClient from './acyum-swap-client' // Import the new client component

// Add metadata for the acyumSwap page
export const metadata: Metadata = {
  title: 'acyumSwap', // Uses template: "acyumSwap | ACYUM"
  description: 'Swap ALPH and ACYUM tokens seamlessly on the Alephium blockchain using the acyumSwap interface. View live market rates.',
  keywords: ['Alephium', 'ACYUM', 'Swap', 'Exchange', 'Token', 'ALPH', 'DeFi', 'Crypto'],
};

// Server Component Page
export default function AcyumSwapPage() {
  return <AcyumSwapClient /> // Render the client component
}

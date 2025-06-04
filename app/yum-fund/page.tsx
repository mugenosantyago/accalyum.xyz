import type { Metadata } from 'next'
import AcyumFundClient from './acyum-fund-client' // Import the new client component

// Add metadata for the Acyum Bank page
// Note: Metadata must be defined outside the component function
export const metadata: Metadata = {
  title: 'ACYUM Fund', // Uses template: "ACYUM Fund | ACYUM"
  description: 'Donate ALPH, sWEA, or ACYUM tokens to support the ACYUM movement and mutual aid funding for indigenous communities.',
  keywords: ['Alephium', 'ACYUM', 'Fund', 'Donate', 'DeFi', 'Crypto', 'Mutual Aid', 'Indigenous Communities'],
};

// Server Component Page
export default function AcyumFundPage() {
  return <AcyumFundClient /> // Render the client component
}

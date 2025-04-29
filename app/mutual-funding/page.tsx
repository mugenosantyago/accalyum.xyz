import type { Metadata } from 'next'
import MutualFundingClient from './mutual-funding-client' // Import the new client component

// Add metadata for the Mutual Funding page
export const metadata: Metadata = {
  title: 'Mutual Funding', // Uses template: "Mutual Funding | ACYUM"
  description: 'Participate in the ACYUM Mutual Funding pool on the Alephium blockchain. Contribute ALPH and track pool statistics.',
  keywords: ['Alephium', 'ACYUM', 'Mutual Funding', 'Pool', 'Contribute', 'DeFi', 'Crypto'],
};

// Server Component Page
export default function MutualFundingPage() {
  return <MutualFundingClient /> // Render the client component
}

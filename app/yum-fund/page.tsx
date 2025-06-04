import type { Metadata } from 'next'
import YumFundClient from './yum-fund-client' // Import the new client component

// Add metadata for the YUM Fund page
// Note: Metadata must be defined outside the component function
export const metadata: Metadata = {
  title: 'YUM Fund', // Uses template: "YUM Fund | YUM"
  description: 'Donate ALPH, sWEA, or YUM tokens to support the YUM movement and mutual aid funding for indigenous communities.',
  keywords: ['Alephium', 'YUM', 'Fund', 'Donate', 'DeFi', 'Crypto', 'Mutual Aid', 'Indigenous Communities'],
};

// Server Component Page
export default function YumFundPage() {
  return <YumFundClient /> // Render the client component
}

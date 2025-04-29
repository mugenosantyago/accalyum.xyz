import type { Metadata } from 'next'
import TokensClient from './tokens-client' // Import the new client component

// Add metadata for the Tokens page
export const metadata: Metadata = {
  title: 'Token Balances', // Uses template: "Token Balances | ACYUM"
  description: 'View your Alephium token balances, including ALPH and ACYUM, with their current estimated values in ALPH and USD.',
  keywords: ['Alephium', 'ACYUM', 'Tokens', 'Balance', 'Wallet', 'Portfolio', 'Crypto'],
};

// Server Component Page
export default function TokensPage() {
  return <TokensClient /> // Render the client component
}

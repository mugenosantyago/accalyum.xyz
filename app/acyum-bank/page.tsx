import type { Metadata } from 'next'
import AcyumBankClient from './acyum-bank-client' // Import the new client component

// Add metadata for the Acyum Bank page
// Note: Metadata must be defined outside the component function
export const metadata: Metadata = {
  title: 'Acyum Bank', // Uses template: "Acyum Bank | ACYUM"
  description: 'Deposit and withdraw ALPH and ACYUM tokens securely using the Acyum Bank feature on the Alephium network. Includes an ACYUM faucet.',
  keywords: ['Alephium', 'ACYUM', 'Bank', 'Deposit', 'Withdraw', 'Faucet', 'DeFi', 'Crypto'],
};

// Server Component Page
export default function AcyumBankPage() {
  return <AcyumBankClient /> // Render the client component
}

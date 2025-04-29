import type { Metadata } from 'next'
import TransactionsClient from './transactions-client' // Import the new client component

// Add metadata for the Transactions page
export const metadata: Metadata = {
  title: 'Transactions', // Uses template: "Transactions | ACYUM"
  description: 'View your transaction history on the Alephium blockchain associated with your connected wallet address via the ACYUM platform.',
  keywords: ['Alephium', 'ACYUM', 'Transactions', 'History', 'Blockchain', 'Explorer', 'Crypto'],
};

// Server Component Page
export default function TransactionsPage() {
  return <TransactionsClient /> // Render the client component
}

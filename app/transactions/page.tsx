import type { Metadata } from 'next'
import TransactionsClient from './transactions-client' // Import the new client component

// Add metadata for the Transactions page
export const metadata: Metadata = {
  title: 'Transactions', // Uses template: "Transactions | YUM"
  description: 'View your transaction history on the Alephium blockchain associated with your connected wallet address via the YUM platform.',
  keywords: ['Alephium', 'YUM', 'Transactions', 'History', 'Blockchain', 'Explorer', 'Crypto'],
};

// Server Component Page
export default function TransactionsPage() {
  return <TransactionsClient /> // Render the client component
}

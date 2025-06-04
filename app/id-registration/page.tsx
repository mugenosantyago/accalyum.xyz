import type { Metadata } from 'next'
import IdRegistrationClient from './id-registration-client' // Import the new client component

// Add metadata for the ID Registration page
export const metadata: Metadata = {
  title: 'ID Registration', // Uses template: "ID Registration | YUM"
  description: 'Register your unique ID on the Alephium blockchain through the YUM platform. Secure your digital identity.',
  keywords: ['Alephium', 'YUM', 'ID Registration', 'Identity', 'Blockchain', 'DID', 'Crypto'],
};

// Server Component Page
export default function IdRegistrationPage() {
  return <IdRegistrationClient /> // Render the client component
}

import type { Metadata } from 'next'
import IdRegistrationClient from './id-registration-client' // Import the new client component

// Add metadata for the ID Registration page
export const metadata: Metadata = {
  title: 'ID Registration', // Uses template: "ID Registration | ACYUM"
  description: 'Register your unique ID on the Alephium blockchain through the ACYUM platform. Secure your digital identity.',
  keywords: ['Alephium', 'ACYUM', 'ID Registration', 'Identity', 'Blockchain', 'DID', 'Crypto'],
};

// Server Component Page
export default function IdRegistrationPage() {
  return <IdRegistrationClient /> // Render the client component
}

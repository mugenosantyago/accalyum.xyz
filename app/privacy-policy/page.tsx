import { ClientLayoutWrapper } from "@/components/client-layout-wrapper";
import { PrivacyContactForm } from "@/components/privacy-contact-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the ACYUM platform.',
};

export default function PrivacyPolicyPage() {
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ClientLayoutWrapper>
      <main className="container mx-auto py-12 px-4">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <h1>Privacy Policy for ACYUM Platform</h1>
          <p className="text-sm text-muted-foreground">Last Updated: {getCurrentDate()}</p>
          
          <p>ACYUM ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we handle your information on the ACYUM platform and its associated services.</p>

          <h2>Information We Handle</h2>
          <p>Our platform interacts with blockchain data which is, by its nature, public. However, we are committed to ensuring the privacy of specific user-associated information within our direct control.</p>
          <ul>
            <li><strong>Blockchain Addresses & Ledger Details:</strong> Your blockchain address and transaction history (ledger details) are inherent to using a blockchain platform. While this information is publicly verifiable on the Alephium blockchain, ACYUM does not aggregate or share your specific ledger details or address activity with any third parties, except as necessary to provide the services to you (e.g., displaying your own transaction history to you when you are logged in). We treat your individual ledger information as private to you.</li>
            <li><strong>Political Affiliation:</strong> If our platform includes features where users may optionally disclose or be associated with political affiliations (e.g., for governance or community features), ACYUM does not share this information with any third parties. This information, if collected with your consent for a specific feature, is treated as private to you and the specific context for which it was provided.</li>
            <li><strong>Contact Information (for Privacy Inquiries):</strong> If you contact us regarding privacy concerns using the form below, we will use the information you provide (such as your email address and message) solely to respond to your inquiry.</li>
          </ul>

          <h2>How We Use Information</h2>
          <ul>
            <li>To provide and maintain our services, including displaying your own bank ledger and transaction history to you.</li>
            <li>To respond to your privacy-related inquiries.</li>
          </ul>

          <h2>Information Sharing</h2>
          <p>We do not sell, trade, or otherwise share your personal ledger details, address activity (beyond what is inherently public on the blockchain), or stated political affiliations with outside parties, except:</p>
          <ul>
            <li>With your explicit consent.</li>
            <li>To comply with the law, enforce our site policies, or protect ours or others\' rights, property, or safety.</li>
            <li>As necessary for the technical operation of the platform (e.g., interacting with the blockchain on your behalf for transactions you initiate).</li>
          </ul>

          <h2>Data Security</h2>
          <p>We implement a variety of security measures to maintain the safety of information within our direct control. However, please remember that blockchain transactions are public and immutable.</p>

          <h2>Your Choices</h2>
          <p>You are in control of the transactions you make on the blockchain. You can choose not to use features that might involve disclosing information you prefer to keep private.</p>
          
          <hr className="my-8" />

          <PrivacyContactForm />

          <hr className="my-8" />

          <h2>Changes to Our Privacy Policy</h2>
          <p>If we decide to change our privacy policy, we will post those changes on this page.</p>

        </article>
      </main>
    </ClientLayoutWrapper>
  );
} 
"use client"

import { useState, useEffect } from 'react';
import { useWallet } from '@alephium/web3-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { useBalance } from '@/components/balance-provider'; // To check ACYUM balance
import { Loader2 } from 'lucide-react';

interface SweaVoteFormProps {
  // Props if any, e.g., a callback after submission
}

export function SweaVoteForm({}: SweaVoteFormProps) {
  const { toast } = useToast();
  const { account, connectionStatus } = useWallet();
  const { acyumBalance: userAcyumTokenBalance } = useBalance(); // Get ACYUM balance from provider

  const [acyumId, setAcyumId] = useState(''); // This will be the Proposal ID
  const [userAcyumIdentifier, setUserAcyumIdentifier] = useState(''); // New state for User's ACYUM ID
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canShowForm, setCanShowForm] = useState(false);

  const userAddress = account?.address;
  const isAdmin = !!userAddress && userAddress === config.alephium.adminAddress; // Ensure userAddress is defined for comparison
  const isConnected = connectionStatus === 'connected';

  useEffect(() => {
    logger.info('[SweaVoteForm Debug] Checking visibility:', {
      isConnected,
      isAdmin,
      userAcyumTokenBalance,
      userAddress
    });

    if (isConnected) {
      if (isAdmin) {
        setCanShowForm(true);
      } else {
        // Check if user holds ACYUM token
        // Ensure hasAcyum is explicitly boolean
        const hasAcyum = !!(userAcyumTokenBalance && parseFloat(userAcyumTokenBalance.replace(/,/g, '')) > 0);
        setCanShowForm(hasAcyum);
      }
    } else {
      setCanShowForm(false);
    }
  }, [isConnected, isAdmin, userAcyumTokenBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acyumId.trim() || !name.trim() || !message.trim() || !userAcyumIdentifier.trim()) { // Make userAcyumIdentifier required
      toast({ title: 'Validation Error', description: 'Proposal ID, Your ACYUM ID, Name, and Message fields are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    logger.info('Submitting sWEA vote/proposal:', { userAddress, proposalId: acyumId, userAcyumIdentifier, name, message });

    try {
      const response = await fetch('/api/swea/submit-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterAddress: userAddress,
          acyumProposalId: acyumId, // This is the Proposal ID
          userAcyumIdentifier: userAcyumIdentifier.trim() || undefined, // Send if provided, else undefined
          submitterName: name,
          voteMessage: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Submission failed with no error message.' }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const result = await response.json();
      toast({ title: 'Submission Successful', description: result.message || 'Your vote/proposal has been recorded.' });
      setAcyumId('');
      setUserAcyumIdentifier(''); // Clear the new field
      setName('');
      setMessage('');
    } catch (error) {
      logger.error('Vote submission failed:', error);
      toast({ title: 'Submission Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canShowForm) {
    // Optionally, provide a message if the form is hidden due to eligibility criteria
    // return (
    //   <Card className="mt-8">
    //     <CardHeader>
    //       <CardTitle>Vote / Submit Proposal</CardTitle>
    //     </CardHeader>
    //     <CardContent>
    //       <p>Please connect your wallet. Admins or ACYUM token holders can participate.</p>
    //     </CardContent>
    //   </Card>
    // );
    return null; 
  }

  return (
    <Card className="mt-8 w-full sm:w-full md:max-w-md md:mx-auto">
      <CardHeader>
        <CardTitle>Cast Your Vote / Submit Proposal</CardTitle>
        <CardDescription>
          {isAdmin ? 'Admin vote/proposal submission.' : 'Participate in sWEA governance. Requires holding ACYUM token.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="w-full">
            <Label htmlFor="proposalId">Proposal ID</Label>
            <Input
              id="proposalId"
              value={acyumId}
              onChange={(e) => setAcyumId(e.target.value)}
              placeholder="Enter the ID of the proposal or vote (e.g., SWP-001)"
              required
            />
          </div>
          <div className="w-full">
            <Label htmlFor="userAcyumIdentifier">Your ACYUM ID</Label>
            <Input
              id="userAcyumIdentifier"
              value={userAcyumIdentifier}
              onChange={(e) => setUserAcyumIdentifier(e.target.value)}
              placeholder="Your registered ACYUM ID (e.g., ACYUM-XYZ123)"
              required
            />
          </div>
          <div className="w-full">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or alias"
              required
            />
          </div>
          <div className="w-full">
            <Label htmlFor="message">Message / Justification</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message, vote justification, or proposal details"
              required
              rows={4}
            />
          </div>
          <Button type="submit" disabled={isSubmitting || !isConnected} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
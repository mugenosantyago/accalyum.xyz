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
import { useBalance } from '@/components/balance-provider'; // To check YUM balance
import { Loader2 } from 'lucide-react';

const DUST_AMOUNT = 10000n; // Define DUST_AMOUNT here as it's used in transactions

interface SweaVoteFormProps {
  // Props if any, e.g., a callback after submission
}

export function SweaVoteForm({}: SweaVoteFormProps) {
  const { toast } = useToast();
  const { account, connectionStatus, signer } = useWallet();
  const { acyumBalance: userAcyumTokenBalance, sweaBalance } = useBalance(); // Get YUM and sWEA balance from provider

  const [acyumId, setAcyumId] = useState(''); // This will be the Proposal ID
  const [userAcyumIdentifier, setUserAcyumIdentifier] = useState(''); // New state for User's YUM ID
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingSwea, setIsPayingSwea] = useState(false); // New state for payment processing
  const [canShowForm, setCanShowForm] = useState(false);

  const userAddress = account?.address;
  const isAdmin = !!userAddress && userAddress === config.alephium.adminAddress; // Ensure userAddress is defined for comparison
  const isConnected = connectionStatus === 'connected';

  // Moved SWEA config to a separate constant for easier access
  const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex;
  const SWEA_DECIMALS = config.alephium.sweaDecimals;
  const SWEA_BANK_ADDRESS = config.treasury.sweaBank;

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

  // New function to handle SWEA payment
  const handleSweaVotePayment = async () => {
    if (!isConnected || !userAddress || !signer) {
      toast({ title: "Wallet Not Connected", description: "Please connect your wallet first.", variant: "destructive" });
      return false; // Indicate failure
    }

    if (!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX") {
      toast({ title: "Configuration Error", description: "sWEA token ID is not configured.", variant: "destructive" });
      return false;
    }

    // Check if user has enough sWEA balance
    const requiredSweaAmount = 1;
    const userSweaBalanceNum = sweaBalance ? parseFloat(sweaBalance.replace(/,/g, '')) : 0;
    if (userSweaBalanceNum < requiredSweaAmount) {
      toast({ title: "Insufficient sWEA", description: `You need ${requiredSweaAmount} sWEA to vote. Your current balance is ${userSweaBalanceNum} sWEA.`, variant: "destructive" });
      return false;
    }

    setIsPayingSwea(true);
    logger.info(`Client: Initiating 1 sWEA payment for vote to ${SWEA_BANK_ADDRESS}`);

    try {
      const amountInSmallestUnit = BigInt(Math.floor(requiredSweaAmount * (10 ** SWEA_DECIMALS)));
      
      const txResult = await signer.signAndSubmitTransferTx({
        signerAddress: userAddress,
         destinations: [{
           address: SWEA_BANK_ADDRESS, // Send 1 sWEA to the sWEA Bank address
           attoAlphAmount: DUST_AMOUNT, // Include DUST_AMOUNT for the ALPH part of the UTXO
           tokens: [{
               id: S_WEA_TOKEN_ID,
               amount: amountInSmallestUnit
           }]
         }]
      });

      logger.info(`Client: sWEA payment for vote successful: Tx ID ${txResult.txId}`);

      // Record this as a 'vote_payment' transaction type
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userAddress: userAddress,
            token: 'sWEA',
            amount: amountInSmallestUnit.toString(),
            txId: txResult.txId,
            type: 'vote_payment', // New type for vote payment
            // initiative: 'vote-module' // Optional: add an initiative
        }),
      });

      toast({
        title: "Payment Successful",
        description: `1 sWEA paid for your vote (Tx: ${txResult.txId}). Proceeding with vote submission.`,
        variant: "default",
      });
      return true; // Indicate success

    } catch (error) {
      logger.error("Error submitting sWEA payment for vote:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to submit sWEA payment for vote.",
        variant: "destructive",
      });
      return false; // Indicate failure
    } finally {
      setIsPayingSwea(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acyumId.trim() || !name.trim() || !message.trim() || !userAcyumIdentifier.trim()) {
      toast({ title: 'Validation Error', description: 'Proposal ID, Your YUM ID, Name, and Message fields are required.', variant: 'destructive' });
      return;
    }

    // Only require payment if not an admin
    let paymentSuccessful = true;
    if (!isAdmin) {
      paymentSuccessful = await handleSweaVotePayment();
      if (!paymentSuccessful) {
        return; // Stop if payment failed
      }
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
          {isAdmin ? 'Admin vote/proposal submission.' : 'Participate in sWEA governance. Requires holding ACYUM token and 1 sWEA payment.'}
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
            <Label htmlFor="userAcyumIdentifier">Your YUM ID</Label>
            <Input
              id="userAcyumIdentifier"
              value={userAcyumIdentifier}
              onChange={(e) => setUserAcyumIdentifier(e.target.value)}
              placeholder="Your registered YUM ID (e.g., YUM-XYZ123)"
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
          <Button type="submit" disabled={isSubmitting || isPayingSwea || !isConnected} className="w-full">
            {(isSubmitting || isPayingSwea) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPayingSwea ? 'Processing Payment...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 
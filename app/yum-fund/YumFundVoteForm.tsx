"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Vote } from 'lucide-react';

interface YumFundVoteFormProps {
  className?: string;
}

export function YumFundVoteForm({ className }: YumFundVoteFormProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    acyumId: '',
    proposalId: '',
    voterName: '',
    voteMessage: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acyumId || !formData.proposalId || !formData.voterName || !formData.voteMessage) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/swea/submit-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submitterAddress: 'yum-fund-voter', // Since this is for YumFund voting
          yumProposalId: formData.proposalId,
          submitterName: formData.voterName,
          voteMessage: formData.voteMessage,
          userYumIdentifier: formData.acyumId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Vote Submitted Successfully",
          description: "Your vote has been submitted for admin review.",
          variant: "default",
        });
        
        // Reset form
        setFormData({
          acyumId: '',
          proposalId: '',
          voterName: '',
          voteMessage: ''
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Vote on YUM Fund Proposals
        </CardTitle>
        <CardDescription>
          Submit your vote on active YUM Fund proposals. Your AccalYUM ID is required for verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acyumId">AccalYUM ID *</Label>
            <Input
              id="acyumId"
              name="acyumId"
              type="text"
              placeholder="YUM-123456"
              value={formData.acyumId}
              onChange={handleInputChange}
              required
              className="bg-gray-50 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500">Enter your registered AccalYUM ID</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposalId">Proposal ID *</Label>
            <Input
              id="proposalId"
              name="proposalId"
              type="text"
              placeholder="Enter the proposal ID you're voting on"
              value={formData.proposalId}
              onChange={handleInputChange}
              required
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voterName">Your Name *</Label>
            <Input
              id="voterName"
              name="voterName"
              type="text"
              placeholder="Enter your name"
              value={formData.voterName}
              onChange={handleInputChange}
              required
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voteMessage">Vote & Justification *</Label>
            <Textarea
              id="voteMessage"
              name="voteMessage"
              placeholder="Explain your vote (Yes/No) and provide your reasoning..."
              value={formData.voteMessage}
              onChange={handleInputChange}
              required
              rows={4}
              className="bg-gray-50 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500">
              Clearly state your vote (Yes/No) and provide detailed reasoning for your decision.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Vote...
              </>
            ) : (
              <>
                <Vote className="mr-2 h-4 w-4" />
                Submit Vote
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Voting Guidelines</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Only registered AccalYUM ID holders can vote</li>
            <li>• Clearly state "Yes" or "No" in your vote message</li>
            <li>• Provide detailed reasoning for your decision</li>
            <li>• All votes are reviewed by administrators</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Calendar, User } from 'lucide-react';
import { Proposal } from '@/lib/types/proposal';

interface YumFundProposalsProps {
  className?: string;
}

export function YumFundProposals({ className }: YumFundProposalsProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/proposals/live');
        
        if (!response.ok) {
          throw new Error('Failed to fetch proposals');
        }
        
        const data = await response.json();
        setProposals(data.proposals || []);
      } catch (err) {
        console.error('Error fetching proposals:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Not published';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Active YUM Fund Proposals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading proposals...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Active YUM Fund Proposals
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-red-600 dark:text-red-400">
            <p>Error loading proposals: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Active YUM Fund Proposals
        </CardTitle>
        <CardDescription>
          Review current proposals and submit your votes using the form below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active proposals at this time.</p>
            <p className="text-sm mt-2">Check back later for new proposals to vote on.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Card key={proposal._id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold mb-2">
                        {proposal.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Published: {formatDate(proposal.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span className="font-mono text-xs">
                            {proposal.authorAddress?.slice(0, 6)}...{proposal.authorAddress?.slice(-4)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {proposal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {proposal.content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Proposal ID: <span className="font-mono">{proposal._id}</span>
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Use this ID when submitting your vote in the form below.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
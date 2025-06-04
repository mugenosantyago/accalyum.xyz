"use client"

import React, { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, ArrowDown, ArrowUp, ExternalLink } from "lucide-react"
import { logger } from '@/lib/logger'
import { useLanguage } from '@/components/language-provider'
import { config } from '@/lib/config'
import Image from 'next/image'

// --- Helper Functions (Consider moving to lib/utils) ---

// Copied from other bank components
function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
    const safeAmount = amount ?? 0n; 
    if (typeof safeAmount !== 'bigint') return "Error";
    if (decimals < 0) return "Error";
    let factor = 1n;
    try {
        if (decimals > 30) throw new Error("Decimals value too large"); 
        for (let i = 0; i < decimals; i++) { factor *= 10n; }
    } catch (e) { return "Error"; }
    if (factor === 0n) factor = 1n;
    const integerPart = safeAmount / factor; 
    const fractionalPart = safeAmount % factor; 
    if (fractionalPart === 0n) return integerPart.toString();
    const displayDecimalsSafe = Math.max(0, Math.min(decimals, displayDecimals));
    const fractionalString = fractionalPart.toString().padStart(decimals, '0');
    const displayFractional = fractionalString.slice(0, displayDecimalsSafe).replace(/0+$/, '');
    return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

function formatDate(dateString: string | Date): string {
  try {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: 'numeric', minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

const getExplorerUrl = (txId: string): string => {
  const network = config.alephium.network;
  if (network === 'testnet') {
    return `https://explorer.testnet.alephium.org/transactions/${txId}`;
  } else if (network === 'mainnet') {
    return `https://explorer.alephium.org/transactions/${txId}`;
  }
  return `#`; // Fallback
}

// --- Ledger Entry Type (Matches API Response) ---
interface LedgerEntry {
  id: string;
  type: 'deposit' | 'withdraw';
  token: 'ALPH' | 'YUM' | 'sWEA';
  amount: string; // Amount in smallest unit (string)
  txId: string;
  timestamp: Date;
}

// --- Component Props ---
interface BankLedgerProps {
  address: string | null; 
  bankName: string; // e.g., "YUM Bank" or "sWEA Bank"
}

// --- Component Implementation ---
export function BankLedger({ address, bankName }: BankLedgerProps) {
  const { t } = useLanguage();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token constants for decimals
  const tokenDecimals: { [key: string]: number } = {
    ALPH: 18,
    YUM: config.alephium.yumDecimals ?? 4,
    sWEA: config.alephium.sweaDecimals ?? 18,
  };

  useEffect(() => {
    const fetchLedger = async () => {
      if (!address) {
        setLedger([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/bank/ledger/${address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch ledger: ${response.statusText}`);
        }
        const data = await response.json();
        setLedger(data.ledger || []);
      } catch (err) {
        logger.error(`Error fetching ${bankName} ledger for ${address}:`, err);
        const message = err instanceof Error ? err.message : "Could not load transaction history";
        setError(message);
        setLedger([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedger();
  }, [address, bankName]); // Re-fetch if address or bankName changes (though bankName likely won't)

  const getTokenIcon = (token: string) => {
      switch(token) {
          case 'YUM': return "/images/logo.png";
          case 'sWEA': return "/IMG_5086_Original.jpg";
          default: return null; // No icon for ALPH currently
      }
  }

  return (
    <Card className="bg-gray-850 border-gray-700 mt-6">
      <CardHeader>
        <CardTitle>{bankName} Ledger</CardTitle>
        <CardDescription>Your deposit and withdrawal history for this bank.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
            <span className="ml-2">Loading ledger...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-8 text-red-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Error loading ledger: {error}</span>
          </div>
        ) : ledger.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transaction history found for this bank.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => {
                const decimals = tokenDecimals[entry.token] ?? 18; // Default to 18 if unknown
                const formattedAmount = formatBigIntAmount(BigInt(entry.amount), decimals, 4);
                const iconSrc = getTokenIcon(entry.token);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <span className={`flex items-center ${entry.type === 'deposit' ? 'text-green-400' : 'text-blue-400'}`}>
                        {entry.type === 'deposit' ? <ArrowDown size={16} className="mr-1"/> : <ArrowUp size={16} className="mr-1"/>}
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {iconSrc && <Image src={iconSrc} alt={entry.token} width={16} height={16} className="rounded-full"/>}
                        {entry.token}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formattedAmount}</TableCell>
                    <TableCell className="text-xs text-gray-400">{formatDate(entry.timestamp)}</TableCell>
                    <TableCell>
                      <a 
                        href={getExplorerUrl(entry.txId)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        title="View on Explorer"
                      >
                        {entry.txId.substring(0, 6)}...{entry.txId.substring(entry.txId.length - 4)}
                        <ExternalLink size={12}/>
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 
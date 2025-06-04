"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useWallet } from '@alephium/web3-react';
import { NodeProvider } from '@alephium/web3';
// Remove deep import for AddressBalance
// import type { AddressBalance } from '@alephium/web3/dist/src/api/api-alephium'; 
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';
import { formatBalance } from '@/lib/utils'; // Import from utils
// Import the generated wrapper for the token contract
// import { PostManager } from '../artifacts/ts/PostManager'; // Keep commented if not directly used for balance

// Helper to format USD value
function formatUsdValue(value: number | null | undefined): string | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return `≈ $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

// Define an interface for the expected balance response shape
interface AddressBalanceResponse {
    balance: string;
    lockedBalance?: string; // Optional
    tokenBalances?: { id: string; amount: string; lockedAmount?: string }[]; // Optional array
    utxoCount?: number; // Optional
}

interface TokenBalance {
    id: string;
    amount: string;
}

interface BalanceContextType {
  alphBalance: string | null;
  yumBalance: string | null;
  sweaBalance: string | null; // Add sWEA balance
  alphUsdValue: string | null; // Add ALPH USD value
  yumUsdValue: string | null; // Add YUM USD value
  sweaUsdValue: string | null; // Add sWEA USD value
  isLoadingBalances: boolean;
  balanceError: string | null;
  refetchBalances: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  alphBalance: null,
  yumBalance: null,
  sweaBalance: null, // Add sWEA balance
  alphUsdValue: null,
  yumUsdValue: null,
  sweaUsdValue: null,
  isLoadingBalances: true,
  balanceError: null,
  refetchBalances: () => {},
});

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { account, connectionStatus, nodeProvider } = useWallet();
  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;

  const [alphBalance, setAlphBalance] = useState<string | null>(null);
  const [yumBalance, setYumBalance] = useState<string | null>(null);
  const [sweaBalance, setSweaBalance] = useState<string | null>(null); // Add sWEA state
  const [alphRawBigInt, setAlphRawBigInt] = useState<bigint | null>(null); // Store raw ALPH for USD calc
  const [yumRawBigInt, setYumRawBigInt] = useState<bigint | null>(null); // Store raw YUM for USD calc
  const [sweaRawBigInt, setSweaRawBigInt] = useState<bigint | null>(null); // Store raw sWEA for USD calc
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Token IDs and Decimals from config
  const yumTokenId = config.alephium.yumTokenIdHex; // Corrected: Use yumTokenIdHex
  const sweaTokenId = config.alephium.sweaTokenIdHex;
  const YUM_DECIMALS = config.alephium.yumDecimals; // Use config
  const SWEA_DECIMALS = config.alephium.sweaDecimals; // Use config
  const ALPH_DECIMALS = 18;
  const YUM_ALPH_RATE = 0.7; // 1 ALPH = 0.7 YUM -> 1 YUM = 1/0.7 ALPH
  const SWEA_ALPH_RATE = 1.0; // 1 ALPH = 1 sWEA -> 1 sWEA = 1 ALPH

  const refetchBalances = () => {
    setFetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address || !nodeProvider) {
        setAlphBalance(null);
        setYumBalance(null);
        setSweaBalance(null); // Reset sWEA
        setAlphRawBigInt(null);
        setYumRawBigInt(null);
        setSweaRawBigInt(null);
        setIsLoadingBalances(false);
        setBalanceError(null);
        return;
      }

      setIsLoadingBalances(true);
      setBalanceError(null);
      setAlphBalance(null);
      setYumBalance(null);
      setSweaBalance(null); // Reset sWEA
      setAlphRawBigInt(null);
      setYumRawBigInt(null);
      setSweaRawBigInt(null);
      logger.info(`Fetching balances for address: ${address}`);

      try {
        // Fetch ALPH and Token Balances together
        // Explicitly cast the result to include tokenBalances
        const balanceResult = await nodeProvider.addresses.getAddressesAddressBalance(address) as AddressBalanceResponse;

        logger.info("Raw balanceResult:", JSON.stringify(balanceResult, null, 2));

        // Format ALPH Balance
        const alphRaw = BigInt(balanceResult.balance ?? '0');
        setAlphRawBigInt(alphRaw);
        const formattedAlph = formatBalance(alphRaw, ALPH_DECIMALS);
        setAlphBalance(formattedAlph);
        logger.info(`Fetched ALPH balance: ${formattedAlph}`);

        // Find and Format YUM Balance from token balances
        if (yumTokenId && YUM_DECIMALS !== undefined) {
            // Type for token should now be inferred correctly
            const yumInfo = balanceResult.tokenBalances?.find(token => token.id === yumTokenId);
            if (yumInfo) {
                const yumRaw = BigInt(yumInfo.amount);
                setYumRawBigInt(yumRaw);
                const formattedYum = formatBalance(yumRaw, YUM_DECIMALS);
                setYumBalance(formattedYum);
                logger.info(`Fetched YUM balance: ${formattedYum}`);
            } else {
                setYumBalance('0'); // Set to 0 if token not found
                setYumRawBigInt(0n);
                logger.info(`YUM token (${yumTokenId}) not found for address ${address}.`);
            }
        } else {
          setYumBalance(null); // Set to null if config is missing
          setYumRawBigInt(null);
          logger.warn("YUM Token ID or Decimals not configured, cannot fetch YUM balance.");
        }

        // Find and Format sWEA Balance from token balances
        if (sweaTokenId && SWEA_DECIMALS !== undefined) {
             // Type for token should now be inferred correctly
            const sweaInfo = balanceResult.tokenBalances?.find(token => token.id === sweaTokenId);
            if (sweaInfo) {
                const sweaRaw = BigInt(sweaInfo.amount);
                setSweaRawBigInt(sweaRaw);
                const formattedSwea = formatBalance(sweaRaw, SWEA_DECIMALS);
                setSweaBalance(formattedSwea);
                logger.info(`Fetched sWEA balance: ${formattedSwea}`);
            } else {
                setSweaBalance('0'); // Set to 0 if token not found
                setSweaRawBigInt(0n);
                logger.info(`sWEA token (${sweaTokenId}) not found for address ${address}.`);
            }
        } else {
          setSweaBalance(null); // Set to null if config is missing
          setSweaRawBigInt(null);
          logger.warn("sWEA Token ID or Decimals not configured, cannot fetch sWEA balance.");
        }

      } catch (error) {
        logger.error("Error fetching balances:", error);
        setBalanceError(error instanceof Error ? error.message : "Failed to fetch balances");
        setAlphBalance(null);
        setYumBalance(null);
        setSweaBalance(null); // Reset sWEA on error
        setAlphRawBigInt(null);
        setYumRawBigInt(null);
        setSweaRawBigInt(null);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [address, isConnected, nodeProvider, yumTokenId, sweaTokenId, YUM_DECIMALS, SWEA_DECIMALS, fetchTrigger]); // Add dependencies

  // Fetch ALPH USD price
  useEffect(() => {
    const fetchAlphPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd');
        if (!response.ok) {
          throw new Error(`Coingecko API Error: ${response.status}`);
        }
        const data = await response.json();
        if (data.alephium && data.alephium.usd) {
          setAlphUsdPrice(data.alephium.usd);
          logger.info("Fetched ALPH USD price:", data.alephium.usd);
        } else {
          throw new Error("Invalid response format from Coingecko");
        }
      } catch (error) {
        logger.error("Failed to fetch ALPH USD price:", error);
        setAlphUsdPrice(null); // Indicate price fetch failed
      }
    };

    fetchAlphPrice();
    // Optionally refetch price periodically or based on some trigger
    // const intervalId = setInterval(fetchAlphPrice, 60000); // e.g., every minute
    // return () => clearInterval(intervalId);
  }, []); // Fetch only once on mount

  // Calculate USD values
  const calculatedAlphUsdValue = useMemo(() => {
      if (alphRawBigInt === null || alphUsdPrice === null) return null;
      const alphAmount = parseFloat(formatBalance(alphRawBigInt, ALPH_DECIMALS).replace(/,/g, ''));
      return alphAmount * alphUsdPrice;
  }, [alphRawBigInt, alphUsdPrice]);

  const calculatedYumUsdValue = useMemo(() => {
    if (yumRawBigInt === null || alphUsdPrice === null || YUM_DECIMALS === undefined) return null;
    const yumAmount = parseFloat(formatBalance(yumRawBigInt, YUM_DECIMALS).replace(/,/g, ''));
    const yumInAlph = yumAmount / YUM_ALPH_RATE; // Convert YUM amount to equivalent ALPH amount
    return yumInAlph * alphUsdPrice;
  }, [yumRawBigInt, alphUsdPrice, YUM_DECIMALS]);

  const calculatedSweaUsdValue = useMemo(() => {
    if (sweaRawBigInt === null || alphUsdPrice === null || SWEA_DECIMALS === undefined) return null;
    const sweaAmount = parseFloat(formatBalance(sweaRawBigInt, SWEA_DECIMALS).replace(/,/g, ''));
    const sweaInAlph = sweaAmount / SWEA_ALPH_RATE; // Convert sWEA amount to equivalent ALPH amount
    return sweaInAlph * alphUsdPrice;
  }, [sweaRawBigInt, alphUsdPrice, SWEA_DECIMALS]);

  const contextValue = useMemo(() => ({
    alphBalance,
    yumBalance,
    sweaBalance,
    isLoadingBalances,
    balanceError,
    alphUsdValue: formatUsdValue(calculatedAlphUsdValue),
    yumUsdValue: formatUsdValue(calculatedYumUsdValue),
    sweaUsdValue: formatUsdValue(calculatedSweaUsdValue),
    refetchBalances,
  }), [
    alphBalance, yumBalance, sweaBalance, 
    calculatedAlphUsdValue, calculatedYumUsdValue, calculatedSweaUsdValue,
    isLoadingBalances, balanceError
  ]); // Add dependencies

  return (
    <BalanceContext.Provider value={contextValue}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalance = () => useContext(BalanceContext); 
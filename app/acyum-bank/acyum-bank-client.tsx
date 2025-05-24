"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { useToast } from "@/components/ui/use-toast"
import { useWallet } from "@alephium/web3-react"
import { useBalance } from "@/components/balance-provider"
import { NodeProvider } from "@alephium/web3"
import { logger } from "@/lib/logger"
import { MakeDeposit } from "@/contracts/scripts"
import { Withdraw } from "@/artifacts2/ts/scripts"
import { config } from "@/lib/config"
import { TokenFaucet } from "@/artifacts/ts"
import Image from 'next/image'
import { BankLedger } from '@/components/bank-ledger'

// Constants and Interfaces (copied from original page.tsx)
const ONE_ALPH = 10n ** 18n;
const ALPH_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";
const DUST_AMOUNT = 10000n;
const ACYUM_DECIMALS = 7; // Define decimals explicitly

// Add sWEA constants, pulling from config or using placeholders
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex ?? "YOUR_SWEA_TOKEN_ID_HEX";
const S_WEA_DECIMALS = config.alephium.sweaDecimals ?? 18;

// Re-declare acyumTokenId constant for use throughout the component
const acyumTokenId = config.alephium.acyumTokenIdHex;

interface CandySwapTokenData {
  id: string; 
  collectionTicker: string; 
  name: string;
  slug: string;
  orderBookPrice?: number; 
  totalVolume?: number;
  dailyVolume?: number;
  // Note: CandySwap API doesn't provide token decimals here, we assume it for ACYUM
}

interface NodeTokenBalance {
  id: string;
  amount: string; // API returns amount as string
}

// Expected return type for getAddressesAddressBalance
interface AddressBalance {
  balance: string; // ALPH balance
  tokenBalances?: NodeTokenBalance[]; // Optional array of token balances
  lockedBalance?: string;
  lockedTokenBalances?: NodeTokenBalance[];
  // Other fields might exist depending on the node version
}

function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
  const safeAmount = amount ?? 0n; 
  if (typeof safeAmount !== 'bigint') { 
      console.error("Invalid amount type passed to formatBigIntAmount:", amount);
      return "Error";
  }

  let factor = 1n;
  try {
    if (decimals < 0 || decimals > 100) { 
      throw new Error("Invalid decimals value");
    }
    for (let i = 0; i < decimals; i++) {
        factor *= 10n;
    }
  } catch (e) {
    console.error("Error calculating factor:", e);
    return "Error";
  }

  const integerPart = safeAmount / factor; 
  const fractionalPart = safeAmount % factor; 
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalString.slice(0, displayDecimals).replace(/0+$/, '');
  return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

// Renamed component
export default function AcyumBankClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const {
    signer,
    connectionStatus,
    account
  } = useWallet()

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  const { 
    alphBalance: displayAlphBalance,
    acyumBalance: displayAcyumBalance,
    sweaBalance: displaySweaBalance,
    isLoadingBalances,
    balanceError
  } = useBalance();

  const [acyumMarketData, setAcyumMarketData] = useState<CandySwapTokenData | null>(null);
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(true);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [depositTokenType, setDepositTokenType] = useState<"ALPH" | "ACYUM" | "sWEA">("ALPH")
  const [withdrawTokenType, setWithdrawTokenType] = useState<"ALPH" | "ACYUM" | "sWEA">("ALPH")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isFaucetProcessing, setIsFaucetProcessing] = useState(false)

  const bankTreasuryAddress = config.treasury.communist;
  const faucetContractAddress = config.alephium.acyumFaucetAddress; // Use new faucet address config
  const providerUrl = config.alephium.providerUrl;

  const [treasuryAlphBalance, setTreasuryAlphBalance] = useState<bigint | null>(null);
  const [treasuryAcyumBalance, setTreasuryAcyumBalance] = useState<bigint | null>(null);
  const [isTreasuryLoading, setIsTreasuryLoading] = useState(true);
  const [treasuryError, setTreasuryError] = useState<string | null>(null);

  // State for User's Net Deposited Bank Balance
  const [userBankAlphBalance, setUserBankAlphBalance] = useState<bigint | null>(null);
  const [userBankAcyumBalance, setUserBankAcyumBalance] = useState<bigint | null>(null);
  const [userBankSweaBalance, setUserBankSweaBalance] = useState<bigint | null>(null);
  const [isUserBankBalanceLoading, setIsUserBankBalanceLoading] = useState(false);
  const [userBankBalanceError, setUserBankBalanceError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsMarketDataLoading(true);
      setMarketDataError(null);
      setAcyumMarketData(null);
      setAlphUsdPrice(null);

      try {
        const [tokenListRes, coingeckoRes] = await Promise.all([
          fetch('/api/candyswap/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        // Process CandySwap data
        if (!tokenListRes.ok) {
          throw new Error(`CandySwap API error! status: ${tokenListRes.status}`);
        }
        const candySwapData: CandySwapTokenData[] = await tokenListRes.json();
        const acyumData = candySwapData.find(token => token.collectionTicker === acyumTokenId);

        if (acyumData) {
          setAcyumMarketData(acyumData);
          logger.info("Fetched ACYUM market data from CandySwap:", acyumData);
        } else {
          logger.warn(`ACYUM token ID (${acyumTokenId}) not found in CandySwap API response.`);
        }

        // Process CoinGecko data
        if (!coingeckoRes.ok) {
          throw new Error(`CoinGecko API error! status: ${coingeckoRes.status}`);
        }
        const coingeckoData = await coingeckoRes.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price from CoinGecko: ${price}`);
        } else {
           throw new Error('Invalid data format from CoinGecko API');
        }
        
        if (!acyumData) {
           setMarketDataError("ACYUM data not found on CandySwap.");
        }

      } catch (error) {
        logger.error("Failed to fetch market data:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(message);
      } finally {
        setIsMarketDataLoading(false);
      }
    };

    if (acyumTokenId) {
      fetchMarketData();
    } else {
      logger.warn("ACYUM Token ID not configured, skipping market data fetch.");
      setIsMarketDataLoading(false);
      setMarketDataError("ACYUM Token ID not configured.");
    }
  }, [acyumTokenId]);

  useEffect(() => {
    let nodeProvider: NodeProvider | null = null;
    if (providerUrl) { 
       try {
         nodeProvider = new NodeProvider(providerUrl);
       } catch (initError) {
         logger.error("Failed to initialize NodeProvider:", initError);
         setTreasuryError("Failed to initialize connection to node.");
         setIsTreasuryLoading(false);
         return;
       }
    } else {
        setTreasuryError("Provider URL not configured.");
        setIsTreasuryLoading(false);
        return;
    }
    
    const fetchTreasuryBalances = async () => {
      if (!nodeProvider || !bankTreasuryAddress) { 
        if (!bankTreasuryAddress) setTreasuryError("Treasury address not configured.");
        setIsTreasuryLoading(false);
        return;
      }

      setIsTreasuryLoading(true);
      setTreasuryError(null);
      setTreasuryAlphBalance(null);
      setTreasuryAcyumBalance(null);

      try {
        logger.info(`Fetching balances for treasury address: ${bankTreasuryAddress}`);
        const balanceResult: AddressBalance = await nodeProvider.addresses.getAddressesAddressBalance(bankTreasuryAddress);
        logger.debug("Treasury balance API result:", balanceResult);
        
        setTreasuryAlphBalance(BigInt(balanceResult.balance));

        if (acyumTokenId && balanceResult.tokenBalances?.length) {
          const treasuryAcyumInfo = balanceResult.tokenBalances.find((token: NodeTokenBalance) => token.id === acyumTokenId);
          setTreasuryAcyumBalance(treasuryAcyumInfo ? BigInt(treasuryAcyumInfo.amount) : 0n);
        } else {
          setTreasuryAcyumBalance(0n);
        }
        logger.info(`Treasury balances set: ALPH=${treasuryAlphBalance ?? 'null'}, ACYUM=${treasuryAcyumBalance ?? 'null'}`);

      } catch (error) {
        logger.error(`Failed to fetch treasury balances for ${bankTreasuryAddress}:`, error);
        const message = error instanceof Error ? error.message : "Could not load treasury balance";
        setTreasuryError(message);
        setTreasuryAlphBalance(null);
        setTreasuryAcyumBalance(null);
      } finally {
        setIsTreasuryLoading(false);
      }
    };

    fetchTreasuryBalances();
    // Optional: Add a timer here to periodically refresh treasury balances if needed
    // const intervalId = setInterval(fetchTreasuryBalances, 30000); // e.g., every 30 seconds
    // return () => clearInterval(intervalId); 

  }, [providerUrl, bankTreasuryAddress, acyumTokenId]);

  // Effect to fetch User's Bank Balance (Uses API)
  useEffect(() => {
    const fetchUserBankBalance = async () => {
      if (!address || !isConnected) {
        setUserBankAlphBalance(null);
        setUserBankAcyumBalance(null);
        setUserBankSweaBalance(null);
        return;
      }
      setIsUserBankBalanceLoading(true);
      setUserBankBalanceError(null);
      logger.info(`Fetching bank balance ledger for user: ${address}`);
      try {
        const response = await fetch(`/api/bank/balance/${address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch user bank balance: ${response.statusText}`);
        }
        const data = await response.json();
        setUserBankAlphBalance(BigInt(data.alphBalance ?? '0'));
        setUserBankAcyumBalance(BigInt(data.acyumBalance ?? '0'));
        setUserBankSweaBalance(BigInt(data.sweaBalance ?? '0'));
        logger.info(`User bank balance fetched: ALPH=${data.alphBalance}, ACYUM=${data.acyumBalance}, sWEA=${data.sweaBalance}`);

      } catch (error) {
        logger.error("Failed to fetch user bank balance:", error);
        const message = error instanceof Error ? error.message : "Could not load deposited balance";
        setUserBankBalanceError(message);
        setUserBankAlphBalance(null);
        setUserBankAcyumBalance(null);
        setUserBankSweaBalance(null);
      } finally {
        setIsUserBankBalanceLoading(false);
      }
    };

    fetchUserBankBalance();

  }, [address, isConnected]); 

  // --- Function to record transaction --- 
  const recordTransaction = async (type: 'deposit' | 'withdraw', token: 'ALPH' | 'ACYUM' | 'sWEA', amountInSmallestUnit: bigint, txId: string) => {
    if (!address) return;
    logger.info(`Recording ${type} transaction: ${amountInSmallestUnit} ${token} for ${address}, TxID: ${txId}`);
    try {
      const response = await fetch('/api/bank/record-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, type, token, amount: amountInSmallestUnit.toString(), txId }), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error (${response.status})`);
      }
      logger.info("Transaction recorded successfully.");
      const fetchUserBankBalance = async () => {
        if (!address || !isConnected) return;
        logger.info(`Re-fetching bank balance ledger for user after ${type}: ${address}`);
        try {
          const response = await fetch(`/api/bank/balance/${address}`);
          if (!response.ok) return;
          const data = await response.json();
          setUserBankAlphBalance(BigInt(data.alphBalance ?? '0'));
          setUserBankAcyumBalance(BigInt(data.acyumBalance ?? '0'));
          setUserBankSweaBalance(BigInt(data.sweaBalance ?? '0'));
          logger.info(`User bank balance re-fetched: ALPH=${data.alphBalance}, ACYUM=${data.acyumBalance}, sWEA=${data.sweaBalance}`);
        } catch (err) {
          logger.error("Failed to re-fetch user bank balance after recording tx:", err);
        }
      }
      fetchUserBankBalance(); 
    } catch (error) {
      logger.error("Failed to record transaction:", error);
      toast({ title: "Ledger Sync Issue", description: `Could not record transaction off-chain: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  const acyumUsdPrice = acyumMarketData?.orderBookPrice && alphUsdPrice
    ? acyumMarketData.orderBookPrice * alphUsdPrice
    : null;

  const handleAlphDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    try {
      logger.info(`Attempting ALPH deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
      const depositAmountAttoAlph = BigInt(Math.floor(depositAmountNum * Number(ONE_ALPH)));
      
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
        destinations: [{
          address: bankTreasuryAddress,
          attoAlphAmount: depositAmountAttoAlph
        }]
      });

      logger.info(`ALPH Deposit successful: Tx ID ${result.txId}`);
      toast({ title: "ALPH Deposit Submitted", description: `Tx ID: ${result.txId}` });
      setDepositAmount("");
      recordTransaction('deposit', 'ALPH', depositAmountAttoAlph, result.txId);
    } catch (error) {
      logger.error("ALPH Deposit failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ALPH Deposit Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAcyumDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    logger.info(`Attempting ACYUM deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
    try {
      const depositAmountSmallestUnit = BigInt(Math.floor(depositAmountNum * (10 ** config.alephium.acyumDecimals)));
      
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
         destinations: [{
           address: bankTreasuryAddress,
           attoAlphAmount: DUST_AMOUNT,
           tokens: [{ id: acyumTokenId, amount: depositAmountSmallestUnit }]
         }]
      });

      logger.info(`ACYUM Deposit successful: Tx ID ${result.txId}`);
      toast({ title: "ACYUM Deposit Submitted", description: `Tx ID: ${result.txId}` });
      setDepositAmount("");
      recordTransaction('deposit', 'ACYUM', depositAmountSmallestUnit, result.txId);
    } catch (error) {
      logger.error("ACYUM Deposit failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ACYUM Deposit Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  // Add sWEA deposit handler
  const handleSweaDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
    // Check if sWEA is configured
    if (!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX") {
        return toast({ title: "Error", description: "sWEA Token ID not configured", variant: "destructive" });
    }
    const depositAmountNum = Number.parseFloat(depositAmount);
    if (!depositAmount || depositAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });

    setIsProcessing(true);
    logger.info(`Attempting sWEA deposit of ${depositAmount} to ${bankTreasuryAddress}...`);
    try {
      const depositAmountSmallestUnit = BigInt(Math.floor(depositAmountNum * (10 ** S_WEA_DECIMALS)));
      
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
         destinations: [{
           address: bankTreasuryAddress,
           attoAlphAmount: DUST_AMOUNT, // Still need dust for token transfers
           tokens: [{ id: S_WEA_TOKEN_ID, amount: depositAmountSmallestUnit }]
         }]
      });

      logger.info(`sWEA Deposit successful: Tx ID ${result.txId}`);
      toast({ title: "sWEA Deposit Submitted", description: `Tx ID: ${result.txId}` });
      setDepositAmount("");

      recordTransaction('deposit', 'sWEA', depositAmountSmallestUnit, result.txId);

    } catch (error) {
      logger.error("sWEA Deposit failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "sWEA Deposit Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAlphWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
    const withdrawAmountAttoAlph = BigInt(Math.floor(withdrawAmountNum * Number(ONE_ALPH)));

    // >> Add Check: withdrawal amount vs user's deposited balance <<
    if (userBankAlphBalance === null && !isUserBankBalanceLoading) {
       return toast({ title: "Error", description: "Cannot verify deposited balance. Please wait or refresh.", variant: "destructive" });
    }
    if (userBankAlphBalance !== null && withdrawAmountAttoAlph > userBankAlphBalance) {
      const available = formatBigIntAmount(userBankAlphBalance, 18, 4);
      return toast({ title: "Withdrawal Failed", description: `Withdrawal amount exceeds your deposited ALPH balance (${available} ALPH).`, variant: "destructive" });
    }

    setIsProcessing(true);
    try {
      logger.info(`Attempting ALPH withdrawal of ${withdrawAmount}...`);
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: ALPH_TOKEN_ID,
          amount: withdrawAmountAttoAlph
        },
        attoAlphAmount: DUST_AMOUNT,
      });
      logger.info(`ALPH Withdrawal successful: Tx ID ${result.txId}`);
      toast({ title: "ALPH Withdrawal Submitted", description: `Tx ID: ${result.txId}` });
      setWithdrawAmount("");

      // Call recordTransaction with smallest unit amount
      recordTransaction('withdraw', 'ALPH', withdrawAmountAttoAlph, result.txId);

    } catch (error) {
      logger.error("ALPH Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ALPH Withdrawal Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAcyumWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
    const withdrawAmountSmallestUnit = BigInt(Math.floor(withdrawAmountNum * (10 ** ACYUM_DECIMALS)));

    // >> Add Check: withdrawal amount vs user's deposited balance <<
     if (userBankAcyumBalance === null && !isUserBankBalanceLoading) {
       return toast({ title: "Error", description: "Cannot verify deposited balance. Please wait or refresh.", variant: "destructive" });
    }
    if (userBankAcyumBalance !== null && withdrawAmountSmallestUnit > userBankAcyumBalance) {
      const available = formatBigIntAmount(userBankAcyumBalance, ACYUM_DECIMALS, 2);
      return toast({ title: "Withdrawal Failed", description: `Withdrawal amount exceeds your deposited ACYUM balance (${available} ACYUM).`, variant: "destructive" });
    }

    setIsProcessing(true);
    try {
      logger.info(`Attempting ACYUM withdrawal of ${withdrawAmount}...`);
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: acyumTokenId,
          amount: withdrawAmountSmallestUnit
        },
        attoAlphAmount: DUST_AMOUNT,
      });

      logger.info(`ACYUM Withdrawal successful: Tx ID ${result.txId}`);
      toast({ title: "ACYUM Withdrawal Submitted", description: `Tx ID: ${result.txId}` });
      setWithdrawAmount("");

      // Call recordTransaction with smallest unit amount
      recordTransaction('withdraw', 'ACYUM', withdrawAmountSmallestUnit, result.txId);

    } catch (error) { // Ensure catch block exists
      logger.error("ACYUM Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "ACYUM Withdrawal Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleSweaWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX") {
        return toast({ title: "Error", description: "sWEA Token ID not configured", variant: "destructive" });
    }
    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
    const withdrawAmountSmallestUnit = BigInt(Math.floor(withdrawAmountNum * (10 ** S_WEA_DECIMALS)));

    // Check: withdrawal amount vs user's deposited sWEA balance
    if (userBankSweaBalance === null && !isUserBankBalanceLoading) {
       return toast({ title: "Error", description: "Cannot verify deposited sWEA balance. Please wait or refresh.", variant: "destructive" });
    }
    if (userBankSweaBalance !== null && withdrawAmountSmallestUnit > userBankSweaBalance) {
      const available = formatBigIntAmount(userBankSweaBalance, S_WEA_DECIMALS, 2);
      return toast({ title: "Withdrawal Failed", description: `Withdrawal amount exceeds your deposited sWEA balance (${available} sWEA).`, variant: "destructive" });
    }

    setIsProcessing(true);
    try {
      logger.info(`Attempting sWEA withdrawal of ${withdrawAmount}...`);
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: S_WEA_TOKEN_ID,
          amount: withdrawAmountSmallestUnit
        },
        attoAlphAmount: DUST_AMOUNT,
      });

      logger.info(`sWEA Withdrawal successful: Tx ID ${result.txId}`);
      toast({ title: "sWEA Withdrawal Submitted", description: `Tx ID: ${result.txId}` });
      setWithdrawAmount("");

      recordTransaction('withdraw', 'sWEA', withdrawAmountSmallestUnit, result.txId);

    } catch (error) {
      logger.error("sWEA Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "sWEA Withdrawal Failed", description: message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositTokenType === 'ALPH') {
      handleAlphDeposit();
    } else if (depositTokenType === 'ACYUM') {
      handleAcyumDeposit();
    } else if (depositTokenType === 'sWEA') {
      handleSweaDeposit(); // Call new handler
    }
  }

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawTokenType === 'ALPH') {
      handleAlphWithdraw();
    } else if (withdrawTokenType === 'ACYUM') {
      handleAcyumWithdraw();
    } else if (withdrawTokenType === 'sWEA') { // Add sWEA withdraw logic
      handleSweaWithdraw();
    }
  }

  // LedgerEntry interface for type safety
  interface LedgerEntry {
    id: string;
    type: 'deposit' | 'withdraw';
    token: 'ALPH' | 'ACYUM' | 'sWEA';
    amount: string;
    txId: string;
    timestamp: Date;
  }

  const handleFaucet = async () => {
    if (!isConnected || !signer || !address ) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!acyumTokenId) return toast({ title: "Error", description: "ACYUM Token ID not configured", variant: "destructive" });
    if (!faucetContractAddress) return toast({ title: "Error", description: "ACYUM Faucet address not configured", variant: "destructive" });

    setIsFaucetProcessing(true);
    logger.info(`Attempting to call 'withdraw' on faucet contract ${faucetContractAddress} for user ${address}...`);

    try {
      // Check user's bank transaction history for eligibility
      logger.info(`Fetching bank transaction ledger for ${address} to check faucet eligibility...`);
      const ledgerResponse = await fetch(`/api/bank/ledger/${address}`);
      if (!ledgerResponse.ok) {
        const errorData = await ledgerResponse.json().catch(() => ({})); // Gracefully handle if JSON parsing fails
        logger.error("Failed to fetch user bank ledger for faucet eligibility:", ledgerResponse.status, errorData);
        toast({ title: "Eligibility Check Failed", description: errorData.error || "Could not verify your bank transaction history. Please try again.", variant: "destructive" });
        setIsFaucetProcessing(false);
        return;
      }

      const ledgerData: { ledger?: LedgerEntry[] } = await ledgerResponse.json();
      const userTransactions = ledgerData.ledger || [];

      const hasDeposited = userTransactions.some(tx => tx.type === 'deposit');
      const hasWithdrawn = userTransactions.some(tx => tx.type === 'withdraw');

      if (!hasDeposited || !hasWithdrawn) {
        let eligibilityMessage = "To use the faucet, you must have at least one deposit and one withdrawal transaction recorded in the Acyum Bank.";
        if (!hasDeposited && !hasWithdrawn) {
          eligibilityMessage = "You need to make a deposit and a withdrawal in the Acyum Bank to use the faucet.";
        } else if (!hasDeposited) {
          eligibilityMessage = "You need to make a deposit in the Acyum Bank to use the faucet.";
        } else if (!hasWithdrawn) {
          eligibilityMessage = "You need to make a withdrawal from the Acyum Bank to use the faucet.";
        }
        logger.info(`User ${address} not eligible for faucet: Deposits: ${hasDeposited}, Withdrawals: ${hasWithdrawn}`);
        toast({ title: "Faucet Not Eligible", description: eligibilityMessage, variant: "default", duration: 7000 });
        setIsFaucetProcessing(false);
        return;
      }

      logger.info(`User ${address} is eligible for faucet. Proceeding with claim.`);

      // Calculate the amount to claim (7 ACYUM)
      const amountToClaim = BigInt(7 * (10 ** config.alephium.acyumDecimals));

      // Get the contract instance
      const faucetInstance = TokenFaucet.at(faucetContractAddress);

      // Call the 'withdraw' method via the transact interface
      const result = await faucetInstance.transact.withdraw({
        signer: signer, // Pass the signer
        args: {
          amount: amountToClaim // Pass the amount to withdraw
        },
        attoAlphAmount: DUST_AMOUNT // Attach required dust
      });

      logger.info(`Faucet 'withdraw' call successful: Tx ID ${result.txId}`);
      toast({ title: "Faucet Claim Submitted", description: `Tx ID: ${result.txId}` });
      // Optionally update balance using useBalance hook if needed
      // updateBalanceForTx(result.txId) 

    } catch (error) {
      logger.error("Faucet 'withdraw' call failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Faucet Failed", description: message, variant: "destructive" });
    } finally {
      setIsFaucetProcessing(false);
    }
  }

  // JSX structure
  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">acyumBank</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Treasury Info Column */} 
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("acyumBanking")}</CardTitle>
                  <CardDescription>{t("depositWithdrawSecurely")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isConnected ? (
                    <div className="text-center py-6">
                      <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                      <WalletConnectDisplay />
                    </div>
                  ) : (
                    <>
                      {/* Removed redundant wallet info display from this column */}
                      {/* <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6"> ... </div> */}

                      {/* ACYUM Faucet Card - This stays here */} 
                       <Card className="mb-6 bg-gray-850 border-gray-700">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-lg">ACYUM Faucet</CardTitle>
                           <CardDescription>Get 7 free ACYUM tokens daily.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button 
                             onClick={handleFaucet} 
                             disabled={isFaucetProcessing}
                             className="w-full bg-blue-600 hover:bg-blue-700"
                           >
                             {isFaucetProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : null}
                             Claim 7 ACYUM
                           </Button>
                        </CardContent>
                      </Card>

                      {/* Display Market Info Card */} 
                      {!isMarketDataLoading && !marketDataError && (acyumMarketData || alphUsdPrice) && (
                        <Card className="mb-6 bg-gray-850 border-gray-700">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-lg">Market Info</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 gap-2 text-sm">
                             {acyumMarketData && (
                               <>
                                 <p>ACYUM/ALPH Price:</p> 
                                 <p className="text-right">{acyumMarketData.orderBookPrice?.toPrecision(4) ?? 'N/A'}</p>
                               </>
                             )}
                             {acyumUsdPrice !== null && (
                              <>
                                <p>ACYUM/USD Price:</p> 
                                <p className="text-right">${acyumUsdPrice.toFixed(4)}</p>
                              </>
                             )}
                             {alphUsdPrice !== null && (
                              <>
                                <p>ALPH/USD Price:</p> 
                                <p className="text-right">${alphUsdPrice.toFixed(4)}</p>
                              </>
                             )}
                             {acyumMarketData && (
                               <>
                                 <p>Total Volume (ACYUM):</p> 
                                 <p className="text-right">{acyumMarketData.totalVolume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
                                 <p>24h Volume (ACYUM):</p> 
                                 <p className="text-right">{acyumMarketData.dailyVolume?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}</p>
                               </>
                             )}
                             <p className="text-xs col-span-2 text-gray-400 pt-2">
                               {acyumMarketData && (
                                 <>Data from <a href={`https://candyswap.gg/token/${acyumMarketData.slug}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">CandySwap</a> {alphUsdPrice && "&"} </> 
                               )}
                               {alphUsdPrice && (
                                <> <a href="https://www.coingecko.com/en/coins/alephium" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">CoinGecko</a></>
                               )}
                             </p>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Main Content Column */} 
             <div className="md:col-span-2 space-y-6">
                {/* User Wallet/Connection Card */}
                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="mb-4 text-amber-600">{t("pleaseConnectWallet")}</p>
                    <WalletConnectDisplay />
                  </div>
                ) : (
                  <>
                    {/* Wallet Info Card with improved styling and all balances */}
                    <Card className="mb-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900 dark:text-white">{t("yourWallet")}</CardTitle>
                        <CardDescription className="font-mono text-xs break-all text-gray-600 dark:text-gray-400">{address}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingBalances ? (
                          <div className="flex items-center justify-center h-20 text-gray-500 dark:text-gray-400">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading balances...
                          </div>
                        ) : balanceError ? (
                          <div className="text-red-600 dark:text-red-500 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
                            Error loading balances: {balanceError}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* ALPH Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">ALPH Balance</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayAlphBalance ?? '0'} ALPH</p>
                              <a 
                                href="https://buy.onramper.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-600 mt-1 inline-block"
                              >
                                Buy ALPH with fiat →
                              </a>
                            </div>
                            {/* ACYUM Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">ACYUM Balance</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displayAcyumBalance ?? '0'} ACYUM</p>
                              {/* Display ACYUM Market Value */}
                              {acyumMarketData?.orderBookPrice !== undefined && alphUsdPrice !== null && displayAcyumBalance && (
                                <>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    ≈ {(Number(displayAcyumBalance.replace(/,/g, '')) * acyumMarketData.orderBookPrice).toFixed(2)} ALPH
                                  </p>
                                  {acyumUsdPrice !== null && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      ≈ ${(Number(displayAcyumBalance.replace(/,/g, '')) * acyumUsdPrice).toFixed(2)} USD
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            {/* sWEA Balance */}
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                <span className="flex items-center gap-1">
                                   <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={14} height={14} className="rounded-full inline-block"/> sWEA Balance
                                </span>
                              </p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{displaySweaBalance ?? '0'} sWEA</p>
                              {/* Potential placeholder for sWEA market value if needed later */}
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <WalletStatusDisplay />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Deposit/Withdraw Tabs - This starts here */} 
                    <Tabs defaultValue="deposit">
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="deposit">{t("deposit")}</TabsTrigger>
                        <TabsTrigger value="withdraw">{t("withdraw")}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="deposit">
                        <form onSubmit={handleDepositSubmit} className="space-y-4">
                          <div className="flex space-x-4 mb-2">
                             <Label>Token:</Label>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="deposit_alph" name="deposit_token" value="ALPH" checked={depositTokenType === 'ALPH'} onChange={() => setDepositTokenType('ALPH')} />
                               <Label htmlFor="deposit_alph">ALPH</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="deposit_acyum" name="deposit_token" value="ACYUM" checked={depositTokenType === 'ACYUM'} onChange={() => setDepositTokenType('ACYUM')} disabled={!acyumTokenId} />
                               <Label htmlFor="deposit_acyum" className={!acyumTokenId ? 'text-gray-500' : ''}>ACYUM</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input 
                                 type="radio" 
                                 id="deposit_swea" 
                                 name="deposit_token" 
                                 value="sWEA" 
                                 checked={depositTokenType === 'sWEA'} 
                                 onChange={() => setDepositTokenType('sWEA')} 
                                 disabled={!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX'}
                               />
                               <Label htmlFor="deposit_swea" className={(!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX') ? 'text-gray-500 cursor-not-allowed' : ''}>
                                 <span className="flex items-center gap-1"><Image src="/IMG_5086_Original.jpg" alt="sWEA" width={12} height={12} className="rounded-full"/> sWEA</span>
                               </Label>
                             </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="depositAmount">{t("amount")} ({depositTokenType})</Label>
                            <Input
                              id="depositAmount"
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              required
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                            disabled={isProcessing || !isConnected || !signer || (depositTokenType === 'ACYUM' && !acyumTokenId) || (depositTokenType === 'sWEA' && !S_WEA_TOKEN_ID)}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowDown className="mr-2 h-4 w-4" />
                                {t("deposit")} {depositTokenType}
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="withdraw">
                        {/* >> Add Display for Available Withdrawal Balance << */}
                        {/* Withdrawal balance display with improved styling */}
                        <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                           <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Available for Withdrawal:</h4>
                            {isUserBankBalanceLoading ? (
                              <span className="italic text-gray-600 dark:text-gray-400">Loading...</span>
                            ) : userBankBalanceError ? (
                              <span className="text-red-600 dark:text-red-500">Error: {userBankBalanceError}</span>
                            ) : (
                               <>
                                 <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">ALPH:</span>
                                    {/* Ensure null check for display */}
                                    <span className="font-mono text-sm text-gray-900 dark:text-white">{userBankAlphBalance !== null ? formatBigIntAmount(userBankAlphBalance, 18, 4) : '-'}</span>
                                 </div>
                                 <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">ACYUM:</span>
                                    {/* Ensure null check for display */}
                                    <span className="font-mono text-sm text-gray-900 dark:text-white">{userBankAcyumBalance !== null ? formatBigIntAmount(userBankAcyumBalance, ACYUM_DECIMALS, 2) : '-'}</span>
                                 </div>
                                 {/* Add sWEA deposited balance display */}
                                 <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                        <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={12} height={12} className="rounded-full inline-block"/> sWEA:
                                    </span>
                                    <span className="font-mono text-sm text-gray-900 dark:text-white">{userBankSweaBalance !== null ? formatBigIntAmount(userBankSweaBalance, S_WEA_DECIMALS, 2) : '-'}</span>
                                 </div>
                               </>
                            )}
                         </div>

                         <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                          <div className="flex space-x-4 mb-2">
                             <Label>Token:</Label>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="withdraw_alph" name="withdraw_token" value="ALPH" checked={withdrawTokenType === 'ALPH'} onChange={() => setWithdrawTokenType('ALPH')} />
                               <Label htmlFor="withdraw_alph">ALPH</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="withdraw_acyum" name="withdraw_token" value="ACYUM" checked={withdrawTokenType === 'ACYUM'} onChange={() => setWithdrawTokenType('ACYUM')} disabled={!acyumTokenId} />
                               <Label htmlFor="withdraw_acyum" className={!acyumTokenId ? 'text-gray-500' : ''}>ACYUM</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                               <input type="radio" id="withdraw_swea" name="withdraw_token" value="sWEA" checked={withdrawTokenType === 'sWEA'} onChange={() => setWithdrawTokenType('sWEA')} disabled={!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX"} />
                               <Label htmlFor="withdraw_swea" className={!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX" ? 'text-gray-500' : ''}>sWEA</Label>
                             </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="withdrawAmount">{t("amount")} ({withdrawTokenType})</Label>
                            <Input
                              id="withdrawAmount"
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              required
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <Button
                            type="submit"
                            className="w-full bg-[#FF6B35] hover:bg-[#E85A2A]"
                            disabled={isProcessing || !isConnected || !signer || (withdrawTokenType === 'ACYUM' && !acyumTokenId) || (withdrawTokenType === 'sWEA' && (!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === "YOUR_SWEA_TOKEN_ID_HEX"))}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}
                              </>
                            ) : (
                              <>
                                <ArrowUp className="mr-2 h-4 w-4" />
                                {t("withdraw")} {withdrawTokenType}
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </>
                )}

                {/* Add Bank Ledger Component */}
                {isConnected && address && (
                  <BankLedger address={address} bankName="ACYUM Bank" />
                )}
             </div>
          </div> 
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDown, ArrowUp, Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper" // Keep wrapper if used for structure
import { WalletStatusDisplay } from "@/components/wallet-status-display"
import { ConnectionSuccessModal } from "@/components/connection-success-modal" // Add connection modal
import { useToast } from "@/components/ui/use-toast"
import { useWallet, useBalance } from "@alephium/web3-react"
import { NodeProvider } from "@alephium/web3"
import { logger } from "@/lib/logger"
import { Withdraw } from "@/contracts/scripts" // Import the Withdraw script
import { config } from "@/lib/config"
import Image from 'next/image'
import { BankLedger } from '@/components/bank-ledger'

// --- Constants ---
const ONE_ALPH = 10n ** 18n; // Keep for dust amount calculations? Or remove if not needed
const ALPH_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000"; // Keep for dust
const DUST_AMOUNT = 10000n;
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex ?? "YOUR_SWEA_TOKEN_ID_HEX";
const S_WEA_DECIMALS = config.alephium.sweaDecimals ?? 18;

// --- Helper Functions (Could move to utils) ---
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

// Specify TokenBalance type
interface TokenBalance { id: string; amount: bigint; }


export default function SweaBankClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  
  const {
    signer,
    connectionStatus,
    account
  } = useWallet()

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  
  // Wallet sWEA Balance
  const sweaBalanceInfo = account?.tokenBalances?.find((token: TokenBalance) => token.id === S_WEA_TOKEN_ID);
  const sweaBalance = sweaBalanceInfo?.amount ?? 0n;
  const displaySweaBalance = formatBigIntAmount(sweaBalance, S_WEA_DECIMALS, 2);

  // State for amounts and processing
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const bankTreasuryAddress = config.treasury.communist; // Assuming same treasury for now
  const providerUrl = config.alephium.providerUrl;

  // State for User's Deposited Bank sWEA Balance
  const [userBankSweaBalance, setUserBankSweaBalance] = useState<bigint | null>(null);
  const [isUserBankBalanceLoading, setIsUserBankBalanceLoading] = useState(false);
  const [userBankBalanceError, setUserBankBalanceError] = useState<string | null>(null);

  // Effect to fetch User's sWEA Bank Balance (Uses API)
  useEffect(() => {
    const fetchUserBankBalance = async () => {
      if (!address || !isConnected) {
        setUserBankSweaBalance(null);
        return;
      }
      setIsUserBankBalanceLoading(true);
      setUserBankBalanceError(null);
      logger.info(`Fetching sWEA bank balance for user: ${address}`);
      try {
        const response = await fetch(`/api/bank/balance/${address}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch user bank balance: ${response.statusText}`);
        }
        const data = await response.json();
        setUserBankSweaBalance(BigInt(data.sweaBalance ?? '0')); // Only fetch sWEA balance
        logger.info(`User sWEA bank balance fetched: ${data.sweaBalance}`);

      } catch (error) {
        logger.error("Failed to fetch user sWEA bank balance:", error);
        const message = error instanceof Error ? error.message : "Could not load deposited sWEA balance";
        setUserBankBalanceError(message);
        setUserBankSweaBalance(null);
      } finally {
        setIsUserBankBalanceLoading(false);
      }
    };

    fetchUserBankBalance();

  }, [address, isConnected]); 

  // --- Function to record transaction --- 
  const recordTransaction = async (type: 'deposit' | 'withdraw', token: 'sWEA', amountInSmallestUnit: bigint, txId: string) => {
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
      // Re-fetch balance after recording
      const fetchUserBankBalance = async () => {
        if (!address || !isConnected) return;
        logger.info(`Re-fetching sWEA bank balance for user after ${type}: ${address}`);
        try {
          const response = await fetch(`/api/bank/balance/${address}`);
          if (!response.ok) return;
          const data = await response.json();
          setUserBankSweaBalance(BigInt(data.sweaBalance ?? '0'));
          logger.info(`User sWEA bank balance re-fetched: ${data.sweaBalance}`);
        } catch (err) {
          logger.error("Failed to re-fetch user sWEA bank balance after recording tx:", err);
        }
      }
      fetchUserBankBalance(); 
    } catch (error) {
      logger.error("Failed to record transaction:", error);
      toast({ title: "Ledger Sync Issue", description: `Could not record transaction off-chain: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  // sWEA deposit handler (similar to AcyumBank's)
  const handleSweaDeposit = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    if (!bankTreasuryAddress) return toast({ title: "Error", description: "Bank treasury address not configured", variant: "destructive" });
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

  // Update sWEA withdraw handler
  const handleSweaWithdraw = async () => {
    if (!isConnected || !address || !signer) return toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
    
    const isConfigured = S_WEA_TOKEN_ID && S_WEA_TOKEN_ID !== "YOUR_SWEA_TOKEN_ID_HEX";
    if (!isConfigured) {
      return toast({ title: "Error", description: "sWEA Token ID not configured", variant: "destructive" });
    }

    const withdrawAmountNum = Number.parseFloat(withdrawAmount);
    if (!withdrawAmount || withdrawAmountNum <= 0) return toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
    
    let withdrawAmountSmallestUnit: bigint;
    try {
      // Use configured decimals for calculation
      const decimals = config.alephium.sweaDecimals ?? 18; 
      withdrawAmountSmallestUnit = BigInt(Math.floor(withdrawAmountNum * (10 ** decimals)));
    } catch (e) {
      logger.error("Error calculating sWEA smallest unit amount:", e);
      return toast({ title: "Error", description: "Could not calculate withdrawal amount.", variant: "destructive" });
    }

    // Check withdrawal amount vs user's deposited sWEA balance
    if (userBankSweaBalance === null && !isUserBankBalanceLoading) {
       return toast({ title: "Error", description: "Cannot verify deposited sWEA balance. Please wait or refresh.", variant: "destructive" });
    }
    if (userBankSweaBalance !== null && withdrawAmountSmallestUnit > userBankSweaBalance) {
      const decimals = config.alephium.sweaDecimals ?? 18;
      const available = formatBigIntAmount(userBankSweaBalance, decimals, 2);
      return toast({ title: "Withdrawal Failed", description: `Withdrawal amount exceeds your deposited sWEA balance (${available} sWEA).`, variant: "destructive" });
    }

    setIsProcessing(true);
    try {
      logger.info(`Attempting sWEA withdrawal of ${withdrawAmount} (${withdrawAmountSmallestUnit} smallest units)...`);
      
      // --- Use Withdraw Script ---
      const result = await Withdraw.execute(signer, {
        initialFields: {
          token: S_WEA_TOKEN_ID, // Use the configured/placeholder token ID
          amount: withdrawAmountSmallestUnit
        },
        attoAlphAmount: DUST_AMOUNT, // Required dust amount for script execution
      });
      // --- End Withdraw Script Usage ---

      logger.info(`sWEA Withdrawal successful: Tx ID ${result.txId}`);
      toast({ 
        title: "sWEA Withdrawal Submitted", 
        description: `Tx ID: ${result.txId}` 
      });
      setWithdrawAmount("");

      // Record the transaction off-chain
      recordTransaction('withdraw', 'sWEA', withdrawAmountSmallestUnit, result.txId);

    } catch (error) { 
      logger.error("sWEA Withdrawal failed", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      // Add check for placeholder ID in error message
      const errorTitle = !isConfigured ? "sWEA Withdrawal Failed (Config Needed)" : "sWEA Withdrawal Failed";
      const errorDesc = !isConfigured ? `Withdrawal attempted with placeholder Token ID. Error: ${message}` : message;
      toast({ title: errorTitle, description: errorDesc, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSweaDeposit();
  }

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSweaWithdraw();
  }

  // --- JSX ---
  return (
    <ClientLayoutWrapper> {/* Optional: Remove if not needed for layout */}
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3">
            <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={32} height={32} className="rounded-full" />
            sWEA Bank
          </h1>
          
          {!isConnected ? (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Connect Wallet</CardTitle>
                <CardDescription>Please connect your wallet to use the sWEA Bank.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <WalletConnectDisplay />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Wallet Info & Actions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your sWEA Wallet</CardTitle>
                    <CardDescription>Your connected wallet address and sWEA balance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("yourWallet")}</p>
                      <p className="font-mono text-sm break-all">{address}</p>
                      <div className="mt-2">
                         <p className="text-sm text-gray-500 dark:text-gray-400">sWEA {t("balance")}</p>
                         <p className="text-xl font-bold flex items-center gap-2">
                           <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={20} height={20} className="rounded-full" />
                           {displaySweaBalance} sWEA
                         </p>
                      </div>
                      <div className="mt-2">
                        <WalletStatusDisplay />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Deposit/Withdraw Tabs */}
                <Card>
                   <CardHeader>
                      <CardTitle>sWEA Bank Actions</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <Tabs defaultValue="deposit">
                         <TabsList className="grid grid-cols-2 mb-4">
                           <TabsTrigger value="deposit">{t("deposit")} sWEA</TabsTrigger>
                           <TabsTrigger value="withdraw">{t("withdraw")} sWEA</TabsTrigger>
                         </TabsList>

                         <TabsContent value="deposit">
                           <form onSubmit={handleDepositSubmit} className="space-y-4">
                             <div className="space-y-2">
                               <Label htmlFor="depositAmount">{t("amount")} (sWEA)</Label>
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
                               disabled={isProcessing || !isConnected || !signer || !S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX'}
                             >
                               {isProcessing ? (
                                 <>
                                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                   {t("processing")}
                                 </>
                               ) : (
                                 <>
                                   <ArrowDown className="mr-2 h-4 w-4" />
                                   {t("deposit")} sWEA
                                 </>
                               )}
                             </Button>
                              {!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX' && (
                                <p className="text-xs text-red-500 text-center pt-2">sWEA Token ID is not configured.</p>
                              )}
                           </form>
                         </TabsContent>

                         <TabsContent value="withdraw">
                           {/* Display Available sWEA Withdrawal Balance */}
                           <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Deposited sWEA Balance:</h4>
                              {isUserBankBalanceLoading ? (
                                 <span className="italic">Loading...</span>
                              ) : userBankBalanceError ? (
                                 <span className="text-red-500">Error: {userBankBalanceError}</span>
                              ) : (
                                 <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1"><Image src="/IMG_5086_Original.jpg" alt="sWEA" width={14} height={14} className="rounded-full"/> sWEA:</span>
                                    <span className="font-mono">{userBankSweaBalance !== null ? formatBigIntAmount(userBankSweaBalance, S_WEA_DECIMALS, 2) : '-'}</span>
                                 </div>
                              )}
                           </div>

                           <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                             <div className="space-y-2">
                               <Label htmlFor="withdrawAmount">{t("amount")} (sWEA)</Label>
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
                               disabled={isProcessing || !isConnected || !signer || !S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX'}
                             >
                               {isProcessing ? (
                                 <>
                                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                   {t("processing")}
                                 </>
                               ) : (
                                 <>
                                   <ArrowUp className="mr-2 h-4 w-4" />
                                   {t("withdraw")} sWEA {/* Removed placeholder text from button */}
                                 </>
                               )}
                             </Button>
                             {!S_WEA_TOKEN_ID || S_WEA_TOKEN_ID === 'YOUR_SWEA_TOKEN_ID_HEX' && (
                                <p className="text-xs text-red-500 text-center pt-2">sWEA Token ID is not configured. Withdrawal will likely fail.</p>
                              )}
                           </form>
                         </TabsContent>
                       </Tabs>
                   </CardContent>
                </Card>
              </div>

              {/* Right Column: Ledger */}
              <div className="md:col-span-1">
                 {isConnected && address && (
                   <BankLedger address={address} bankName="sWEA Bank" />
                 )}
              </div>
            </div>
          )}
          <ConnectionSuccessModal featureName="sWEA Bank" />
        </main>
      </div>
    </ClientLayoutWrapper> // Optional: Remove if not needed
  )
} 
"use client"

import { useState, useEffect, useCallback } from "react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWallet } from "@alephium/web3-react"
import { useToast } from "@/components/ui/use-toast"
import { config } from "@/lib/config"
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Search,
  Plus,
  ArrowDown,
  ArrowUp,
  Coins,
  Banknote,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  addFundsToTreasury,
  withdrawFromTreasury,
  addFundsToFaucet,
  getTreasuryBalance,
  getFaucetBalance,
} from "@/app/actions/treasury-actions"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { formatBigIntAmount } from "@/lib/utils"
import Image from "next/image"
import { 
  getSweaBalanceAction, 
  addSweaToTreasuryAction 
} from "@/app/actions/swea-actions"
import { logger } from "@/lib/logger"
import { AlephiumConnectButton } from "@alephium/web3-react"
import { User } from "@/lib/types/user"
import { useLanguage } from "@/components/language-provider"
import type { Proposal } from "@/lib/types/proposal"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Imports from Bank Client ---
import { MakeDeposit, Withdraw } from "../../artifacts/ts/scripts"
import { getTokenBalanceAction, getAcyumTokenId } from "@/app/actions/token-actions"
// --- End Imports ---

// --- Constants from Bank Client ---
const ONE_ALPH = 10n ** 18n;
const DUST_AMOUNT = 10000n;
// --- End Constants ---

interface PendingApproval {
  _id: string
  address: string
  username: string
  email: string
  createdAt: string
  firstName: string
  lastName: string
  addressDigits: string
  politicalParties: string[]
}

interface SweaClaimRequest {
  _id: string;
  acyumId: string;
  requesterAddress: string;
  amount: string;
  tokenId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // Use string for date fetched from API
}

async function getSweaTreasuryBalance(treasuryAddress: string): Promise<{ success: boolean; balance: string; error?: string }> {
  console.warn("getSweaTreasuryBalance not implemented");
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, balance: "1234567.89" };
}

async function addSweaToTreasury(amount: string, treasuryAddress: string): Promise<{ success: boolean; txId?: string; error?: string }> {
  console.warn("addSweaToTreasury not implemented");
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true, txId: "placeholder_tx_id_add_swea" };
}

async function withdrawSweaFromTreasury(amount: string, treasuryAddress: string): Promise<{ success: boolean; txId?: string; error?: string }> {
  console.warn("withdrawSweaFromTreasury not implemented");
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true, txId: "placeholder_tx_id_withdraw_swea" };
}

export default function AdminPage() {
  const { account, connectionStatus, signer } = useWallet()
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newAcyumId, setNewAcyumId] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    address: "",
    acyumId: "",
  })

  // Treasury management states
  const [sweaTreasuryBalance, setSweaTreasuryBalance] = useState("0")
  
  const [sweaDepositAmount, setSweaDepositAmount] = useState("")
  const [withdrawSweaAmount, setWithdrawSweaAmount] = useState("")
  const [isSweaProcessing, setIsSweaProcessing] = useState(false)

  // State for Proposals
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)
  const [newProposal, setNewProposal] = useState({ title: "", content: "" })
  const [isCreatingProposal, setIsCreatingProposal] = useState(false)
  const [isUpdatingProposal, setIsUpdatingProposal] = useState(false)

  // State for Transactions and Donations tab
  const [transactions, setTransactions] = useState<any[]>([]); // TODO: Define a proper interface for transaction records
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // State for sWEA Claim Requests
  const [pendingSweaClaimRequests, setPendingSweaClaimRequests] = useState<SweaClaimRequest[]>([]);
  const [isLoadingSweaClaimRequests, setIsLoadingSweaClaimRequests] = useState(false);
  const [sweaClaimRequestsError, setSweaClaimRequestsError] = useState<string | null>(null);

  const isConnected = connectionStatus === 'connected' && !!account?.address
  const address = account?.address
  const sweaBankAddress = config.treasury.sweaBank
  const sweaTokenId = config.alephium.sweaTokenIdHex
  const sweaDecimals = config.alephium.sweaDecimals

  // --- Addresses from Config ---
  const bankTreasuryAddress = config.treasury.communist;
  // --- End Addresses ---

  const fetchData = useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      }

      const usersResponse = await fetch("/api/admin/users", { headers })
      if (!usersResponse.ok) {
        throw new Error("Failed to fetch users")
      }
      const usersData = await usersResponse.json()
      setUsers(Array.isArray(usersData?.users) ? usersData.users : [])

      const approvalsResponse = await fetch("/api/admin/pending-approvals", { headers })
      if (!approvalsResponse.ok) {
        throw new Error("Failed to fetch pending approvals")
      }
      const approvalsData = await approvalsResponse.json()
      setPendingApprovals(Array.isArray(approvalsData?.pendingApprovals) ? approvalsData.pendingApprovals : [])

      // Fetch proposals
      setIsLoadingProposals(true);
      const proposalsResponse = await fetch("/api/admin/proposals", { headers });
      if (!proposalsResponse.ok) {
        throw new Error("Failed to fetch proposals");
      }
      const proposalsData = await proposalsResponse.json();
      setProposals(Array.isArray(proposalsData?.proposals) ? proposalsData.proposals : []);

    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
      setUsers([]);
      setPendingApprovals([]);
      setProposals([]); // Clear proposals on error
      setPendingSweaClaimRequests([]); // Clear sWEA claim requests on error
    } finally {
      setIsLoading(false);
      setIsLoadingProposals(false);
      setIsLoadingSweaClaimRequests(false); // Ensure loading state is reset
    }
  }, [address, toast])

  // Define fetch functions *before* the main useEffect that uses them
  const fetchTreasuryData = useCallback(async () => {
    try {
      // Fetch sWEA treasury balance
      if (sweaBankAddress && sweaTokenId) {
        const sweaTreasuryBalanceResult = await getTokenBalanceAction(sweaBankAddress, sweaTokenId);
        if (sweaTreasuryBalanceResult.success) {
          setSweaTreasuryBalance(sweaTreasuryBalanceResult.balance);
        }
      } else if (!sweaBankAddress) {
         setSweaTreasuryBalance("sWEA Bank Address Not Set");
      } else if (!sweaTokenId) {
         setSweaTreasuryBalance("sWEA Token ID Not Set");
      }

    } catch (error) {
      console.error("Error fetching treasury/faucet data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch treasury/faucet data. Please try again.",
        variant: "destructive",
      });
      // Set balances to error state on failure
      setSweaTreasuryBalance("Error");
    }
  }, [bankTreasuryAddress, sweaBankAddress, sweaTokenId, toast]);

  // Function to fetch transaction and donation records
  const fetchTransactionsAndDonations = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-wallet-address": address || "", // Include admin address in header
      };
      const response = await fetch("/api/admin/transactions", { headers }); // Assuming this endpoint exists
      if (!response.ok) {
        throw new Error("Failed to fetch transactions and donations");
      }
      const data = await response.json();
      setTransactions(Array.isArray(data?.records) ? data.records : []); // Assuming the response has a 'records' field
    } catch (error) {
      console.error("Error fetching transactions and donations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction and donation history. Please try again.",
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [address, toast]); // Added dependencies

  const checkAdminStatus = useCallback(async () => {
    setIsLoading(true); // Start loading indication for the whole page
    if (isConnected && address) {
      if (address === config.alephium.adminAddress) {
        setIsAdmin(true);
        // Fetch all admin-specific data in parallel
        try {
          await Promise.all([
            fetchData(), // fetchData now includes proposals
            fetchTreasuryData(), 
          ]);
        } catch (error) {
          console.error("Error during admin data fetch ensemble:", error);
          toast({ title: "Admin Data Error", description: "Could not load all admin data.", variant: "destructive" });
          // Ensure states are safe even if Promise.all has an issue not caught by individual fetches
          setUsers([]);
          setPendingApprovals([]);
          setProposals([]);
          setSweaTreasuryBalance("Error");
        }
      } else {
        setIsAdmin(false);
        toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
      }
    } else {
      setIsAdmin(false); // Not connected or no address
    }
    setIsLoading(false); // Stop loading indication after checks and data fetching (or denial)
    // Fetch transactions and donations when admin status is checked and wallet is connected/admin
    if (isConnected && address && isAdmin) {
       fetchTransactionsAndDonations();
    }
  }, [isConnected, address, fetchData, fetchTreasuryData, toast, isAdmin, fetchTransactionsAndDonations]); // Added fetchTransactionsAndDonations as dependency

  useEffect(() => {
    checkAdminStatus()
  }, [checkAdminStatus])

  const handleAddFundsToTreasury = useCallback(async () => {
    if (!sweaDepositAmount || Number.parseFloat(sweaDepositAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive",
      });
      return;
    }

    if (!signer) {
       toast({ title: "Wallet Error", description: "Signer not available.", variant: "destructive" });
       return;
    }
    if (!address) {
       toast({ title: "Wallet Error", description: "Admin address not found.", variant: "destructive" });
       return;
    }
    if (!bankTreasuryAddress) {
      toast({ title: "Config Error", description: "Bank treasury address not configured.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      // Handle sWEA deposit
      const amountInSmallestUnit = BigInt(Math.floor(Number.parseFloat(sweaDepositAmount) * (10 ** sweaDecimals)));

      logger.info(`Client: Signing sWEA deposit of ${sweaDepositAmount} to ${sweaBankAddress}`);

      const result = await MakeDeposit.execute(
        signer,
        {
          attoAlphAmount: amountInSmallestUnit,
          account: address,
          bank: bankTreasuryAddress
        }
      );

      logger.info(`Client: sWEA Deposit successful: Tx ID ${result.txId}`);

      toast({
        title: "Success",
        description: `sWEA deposit submitted (Tx: ${result.txId})`,
        variant: "default",
      });
      setSweaDepositAmount("");
      // Refresh balance after a delay to allow propagation
      setTimeout(fetchTreasuryData, 5000);

    } catch (error) {
      logger.error("Error submitting sWEA deposit transaction:", error);
      toast({
        title: "Deposit Error",
        description: error instanceof Error ? error.message : "Failed to submit sWEA deposit",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [sweaDepositAmount, address, toast, fetchTreasuryData, signer, bankTreasuryAddress, sweaDecimals]);

  const handleWithdrawFromTreasury = useCallback(async () => {
    // This is still a placeholder as secure withdrawal from a basic address isn't feasible via UI
    console.warn("Withdraw sWEA from treasury simulation running - NOT IMPLEMENTED SECURELY");
    toast({ title: "Not Implemented", description: "Withdrawal from a basic address treasury requires private key access or a contract with a withdrawal function.", variant: "destructive" });
  }, []);

  const handleAddFundsToFaucet = useCallback(async () => {
    console.warn("Faucet funding is removed.");
    toast({ title: "Feature Removed", description: "Faucet funding is no longer available in the admin panel.", variant: "default" });
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/approve-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to approve user")
      }

      toast({
        title: "Success",
        description: "User has been approved and ACYUM ID has been assigned.",
        variant: "default",
      })

      await fetchData()
    } catch (error) {
      console.error("Error approving user:", error)
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [address, toast, fetchData]) // Added dependencies

  const handleReject = useCallback(async (id: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/reject-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject user")
      }

      toast({
        title: "Success",
        description: "User has been rejected.",
        variant: "default",
      })

      await fetchData()
    } catch (error) {
      console.error("Error rejecting user:", error)
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [address, toast, fetchData]) // Added dependencies

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewAcyumId(user.acyumId || "")
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = useCallback(async () => {
    if (!editingUser) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/update-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
        },
        body: JSON.stringify({
          id: editingUser._id,
          acyumId: newAcyumId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user")
      }

      toast({
        title: "Success",
        description: "User ACYUM ID has been updated.",
        variant: "default",
      })

      setIsEditDialogOpen(false)
      await fetchData()
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [editingUser, newAcyumId, address, toast, fetchData]) // Added dependencies

  const handleDeleteUser = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      toast({
        title: "Success",
        description: "User has been deleted.",
        variant: "default",
      })

      await fetchData()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [address, toast, fetchData]) // Added dependencies

  const handleCreateUser = useCallback(async () => {
    if (!newUserData.username || !newUserData.email || !newUserData.address || !newUserData.acyumId) {
      toast({
        title: "Error",
        description: "All fields are required.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address || "",
        },
        body: JSON.stringify(newUserData),
      })

      if (!response.ok) {
        throw new Error("Failed to create user")
      }

      toast({
        title: "Success",
        description: "User has been created with ACYUM ID.",
        variant: "default",
      })

      setIsCreateDialogOpen(false)
      setNewUserData({
        username: "",
        email: "",
        address: "",
        acyumId: "",
      })
      await fetchData()
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [newUserData, address, toast, fetchData]) // Added dependencies

  const generateAcyumId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = "ACYUM-"
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.acyumId && user.acyumId.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // sWEA Treasury Handlers (using server action for deposit simulation)
  const handleAddSweaToTreasury = useCallback(async () => {
    if (!sweaDepositAmount || Number.parseFloat(sweaDepositAmount) <= 0) return toast({ title: "Invalid amount", variant: "destructive" })
    if (!sweaBankAddress || !sweaTokenId) return toast({ title: "sWEA Config Error", description: "sWEA Bank address or Token ID not configured.", variant: "destructive" })
    if (!signer) return toast({ title: "Wallet Error", description: "Signer not available.", variant: "destructive" })
    if (!address) return toast({ title: "Wallet Error", description: "Admin address not found.", variant: "destructive" }) // Need admin address

    setIsSweaProcessing(true)
    try {
      // --- Client-side Signing (Required for Real TX) --- 
      // 1. Calculate amount in smallest unit
      const amountSmallestUnit = BigInt(Math.floor(Number.parseFloat(sweaDepositAmount) * (10 ** sweaDecimals)));
      // 2. Build and submit the transaction using the signer
      logger.info(`Client: Signing sWEA deposit of ${sweaDepositAmount} to ${sweaBankAddress}`);
      const result = await signer.signAndSubmitTransferTx({
        signerAddress: address,
        destinations: [{
          address: sweaBankAddress,
          attoAlphAmount: 10000n, // Hardcoded DUST_AMOUNT, verify correct value/import
          tokens: [{ id: sweaTokenId, amount: amountSmallestUnit }]
        }]
      });
      logger.info(`Client: sWEA Deposit successful: Tx ID ${result.txId}`);
      // --- End Client-side Signing ---
      
      // Optional: Call server action just to log/verify (if needed)
      // await addSweaToTreasuryAction(address, sweaDepositAmount, sweaBankAddress);

      toast({ title: "Success", description: `sWEA deposit submitted (Tx: ${result.txId})`, variant: "default" })
      setSweaDepositAmount("")
      // Refresh balance after a delay to allow propagation
      setTimeout(fetchTreasuryData, 5000);

    } catch (error) {
      logger.error("Error submitting sWEA deposit transaction:", error)
      toast({ title: "Deposit Error", description: error instanceof Error ? error.message : "Failed to submit sWEA deposit", variant: "destructive" })
    } finally {
      setIsSweaProcessing(false)
    }
  }, [sweaDepositAmount, sweaBankAddress, sweaTokenId, sweaDecimals, signer, address, toast, fetchTreasuryData]);

  const handleWithdrawSweaFromTreasury = useCallback(async () => {
    // --- Keeping Placeholder Logic ---
    // As discussed, secure withdrawal from a basic address via UI is not feasible without keys/contract.
    console.warn("withdrawSweaFromTreasury simulation running - NOT IMPLEMENTED SECURELY");
    toast({ title: "Not Implemented", description: "Withdrawal from treasury requires a specific contract setup for security or private key access.", variant: "destructive" });
    // --- End Placeholder ---

  }, [withdrawSweaAmount, sweaBankAddress, sweaTokenId, signer, toast, fetchTreasuryData]);

  const handleCreateProposal = useCallback(async () => {
    if (!newProposal.title || !newProposal.content) {
      toast({
        title: "Error",
        description: "Title and Content are required.",
        variant: "destructive",
      });
      return;
    }

    if (!address) {
      toast({
        title: "Error",
        description: "Admin wallet address not available.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingProposal(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      };

      const response = await fetch("/api/admin/proposals", {
        method: "POST",
        headers,
        body: JSON.stringify(newProposal),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error creating proposal:", result);
        throw new Error(result.message || "Failed to create proposal");
      }

      toast({
        title: "Success",
        description: "Proposal created successfully.",
        variant: "default",
      });

      setNewProposal({ title: "", content: "" });
      fetchData();

    } catch (error) {
      console.error("Error creating proposal:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreatingProposal(false);
    }
  }, [newProposal, address, toast, fetchData]);

  const handleUpdateProposalStatus = useCallback(async (id: string, status: 'draft' | 'live' | 'archived') => {
    if (!address) {
      toast({
        title: "Error",
        description: "Admin wallet address not available.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProposal(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      };

      // Note: We are sending the update to the base /api/admin/proposals route
      // The backend will handle the update based on the ID in the body.
      const response = await fetch("/api/admin/proposals", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`Error updating proposal ${id} status to ${status}:`, result);
        throw new Error(result.message || `Failed to update proposal status to ${status}`);
      }

      toast({
        title: "Success",
        description: `Proposal status updated to '${status}'.`,
        variant: "default",
      });

      fetchData();

    } catch (error) {
      console.error(`Error updating proposal status to ${status}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProposal(false);
    }
  }, [address, toast, fetchData]);

  // Fetch sWEA Claim Requests
  const fetchSweaClaimRequests = useCallback(async () => {
    setIsLoadingSweaClaimRequests(true);
    setSweaClaimRequestsError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-wallet-address": address, // Assuming admin address is needed for auth
      };
      logger.info("Admin: Fetching pending sWEA claim requests...");
      const response = await fetch("/api/swea/claim-requests?status=pending", { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch sWEA claim requests");
      }

      const data = await response.json();
      setPendingSweaClaimRequests(Array.isArray(data?.claimRequests) ? data.claimRequests : []);
      logger.info(`Admin: Fetched ${data.claimRequests?.length || 0} pending sWEA claim requests.`);

    } catch (error) {
      logger.error("Admin: Error fetching sWEA claim requests:", error);
      setSweaClaimRequestsError(error instanceof Error ? error.message : "An unknown error occurred");
      setPendingSweaClaimRequests([]);
    } finally {
      setIsLoadingSweaClaimRequests(false);
    }
  }, [address]); // Dependency for useCallback

  // Handle Processing sWEA Claim Request
  const handleProcessSweaClaim = async (request: SweaClaimRequest) => {
    if (!signer || !address || address !== config.alephium.adminAddress) {
      toast({ title: "Error", description: "Not authorized or wallet not connected as admin.", variant: "destructive" });
      return;
    }
    if (request.status !== 'pending') {
       toast({ title: "Info", description: "This claim request is not pending.", variant: "default" });
       return;
    }

    setIsProcessing(true); // Use general processing state for now
    toast({ title: "Processing Claim", description: `Processing claim for ${request.acyumId}...`, variant: "default" });

    try {
      // Convert amount string to BigInt for transaction
      const amountBigInt = BigInt(request.amount);

      // Assuming the sWEA token has decimals defined in config
      const sweaDecimals = config.alephium.sweaDecimals ?? 18; // Use fallback if config is not set
      const amountInSmallestUnit = amountBigInt * (10n ** BigInt(sweaDecimals));

      // Use signAndSubmitTransferTx to send sWEA from admin wallet to requester
      logger.info(`Admin: Sending ${request.amount} sWEA to ${request.requesterAddress} (Request ID: ${request._id})`);
      
      const txResult = await signer.signAndSubmitTransferTx({
         signerAddress: address, // Admin's address
         destinations: [{
           address: request.requesterAddress, // Requester's address
           attoAlphAmount: DUST_AMOUNT, // Include DUST_AMOUNT for the ALPH part of the UTXO
           tokens: [{
               id: request.tokenId,
               amount: amountInSmallestUnit
           }]
         }]
      });

      logger.info(`Admin: sWEA transfer transaction submitted: ${txResult.txId}`);

      // Update claim request status in the backend
      const updateResponse = await fetch(`/api/swea/claim-requests/${request._id}`, {
          method: 'PUT', // Or POST, depending on API design for updates
          headers: {
              'Content-Type': 'application/json',
              "x-wallet-address": address, // Assuming admin address is needed for auth
          },
          body: JSON.stringify({
              status: 'approved',
              processedTxId: txResult.txId, // Store the transaction ID
          }),
      });

      if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          logger.error(`Admin: Failed to update sWEA claim request status ${request._id}: ${errorData.error || updateResponse.statusText}`);
          // Show a warning, but don't fail the whole process as the token was sent
          toast({ title: "Warning", description: "sWEA sent, but failed to update claim status in database.", variant: "default" });
      } else {
          logger.info(`Admin: sWEA claim request ${request._id} status updated to approved.`);
          toast({ title: "Success", description: `sWEA sent to ${request.requesterAddress}. Tx ID: ${txResult.txId}`, variant: "default" });
      }

      // Refresh the list of pending requests
      fetchSweaClaimRequests();

    } catch (error) {
      logger.error("Admin: Error processing sWEA claim request:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Processing Failed", description: `Failed to process claim for ${request.acyumId}: ${message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (address) {
      fetchData();
      fetchTreasuryData();
      fetchSweaClaimRequests(); // Fetch sWEA claim requests on mount
    }
  }, [address, fetchData, fetchTreasuryData, fetchSweaClaimRequests]); // Add fetchSweaClaimRequests to dependencies

  // Check if connected address is admin (simple check using config for now)
  useEffect(() => {
    if (isConnected && address) {
      if (address === config.alephium.adminAddress) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [isConnected, address]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription className="text-gray-400">
                Connect your wallet to access the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <AlephiumConnectButton.Custom>
                {({ show }) => (
                  <Button 
                    className="bg-[#FF6B35] hover:bg-[#E85A2A]" 
                    onClick={show}
                  >
                Connect Wallet
              </Button>
                )}
              </AlephiumConnectButton.Custom>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription className="text-gray-400">
                You do not have permission to access the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-red-500">This area is restricted to authorized administrators only.</p>
              <p className="text-center mt-2 text-sm text-gray-400">
                Connected address: {address}
                <br />
                Admin address: {config.alephium.adminAddress}
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

          <Tabs defaultValue="users">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="proposals">Proposals</TabsTrigger>
              <TabsTrigger value="transactions">Transactions/Donations</TabsTrigger>
              <TabsTrigger value="swea-claims">sWEA Claim Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Registered Users</CardTitle>
                  <CardDescription className="text-gray-400">
                    View and manage all registered users with ACYUM IDs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        className="pl-8 bg-gray-800 border-gray-700 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No registered users found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Username</TableHead>
                          <TableHead className="text-gray-400">Email</TableHead>
                          <TableHead className="text-gray-400">Wallet Address</TableHead>
                          <TableHead className="text-gray-400">ACYUM ID</TableHead>
                          <TableHead className="text-gray-400">Claimed sWEA</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user._id} className="border-gray-800">
                            <TableCell className="font-medium text-gray-300">{user.username}</TableCell>
                            <TableCell className="text-gray-300">{user.email}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-300">{user.address}</TableCell>
                            <TableCell className="text-gray-300">{user.acyumId || "Not assigned"}</TableCell>
                            <TableCell className="text-gray-300">
                              {user.hasClaimedInitialSwea ? (
                                <span className="text-green-400">Yes</span>
                              ) : (
                                <span className="text-red-400">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-500 border-blue-500 hover:bg-blue-950"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-500 hover:bg-red-950"
                                  onClick={() => handleDeleteUser(user._id)}
                                >
                                  <Trash className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription className="text-gray-400">Review and approve new user registrations.</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingApprovals.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No pending approvals.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Username</TableHead>
                          <TableHead className="text-gray-400">Email</TableHead>
                          <TableHead className="text-gray-400">Wallet Address</TableHead>
                          <TableHead className="text-gray-400">Details</TableHead>
                          <TableHead className="text-gray-400">Date</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApprovals.map((approval) => (
                          <TableRow key={approval._id} className="border-gray-800">
                            <TableCell className="font-medium text-gray-300">{approval.username}</TableCell>
                            <TableCell className="text-gray-300">{approval.email}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-300">{approval.address}</TableCell>
                            <TableCell>
                              <div className="text-gray-300">
                                {approval.firstName} {approval.lastName}
                              </div>
                              <div className="text-xs text-gray-400">Address: {approval.addressDigits}</div>
                              <div className="text-xs text-gray-400">
                                Parties: {approval.politicalParties ? approval.politicalParties.join(", ") : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(approval.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-500 border-green-500 hover:bg-green-950"
                                  onClick={() => handleApprove(approval._id)}
                                  disabled={isProcessing}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-500 hover:bg-red-950"
                                  onClick={() => handleReject(approval._id)}
                                  disabled={isProcessing}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposals">
              <Card>
                <CardHeader>
                  <CardTitle>Proposals</CardTitle>
                  <CardDescription>Manage site proposals.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingProposals ? (
                    <div className="flex items-center justify-center h-40 text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading proposals...
                    </div>
                  ) : proposals.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No proposals found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposals.map((proposal) => (
                          <TableRow key={proposal._id}>
                            <TableCell>{proposal.title}</TableCell>
                            <TableCell>{proposal.status}</TableCell>
                            <TableCell className="font-mono text-xs">{proposal.authorAddress}</TableCell>
                            <TableCell>{new Date(proposal.createdAt!).toLocaleString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                              {proposal.status === 'draft' && (
                                <Button size="sm" onClick={() => handleUpdateProposalStatus(proposal._id!, 'live')} disabled={isUpdatingProposal}>Publish</Button>
                              )}
                              {proposal.status === 'live' && (
                                <Button size="sm" variant="secondary" onClick={() => handleUpdateProposalStatus(proposal._id!, 'archived')} disabled={isUpdatingProposal}>Archive</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <div className="mb-8 space-y-4 p-4 border rounded-md bg-gray-850 border-gray-700">
                    <h3 className="text-lg font-semibold mb-2">Create New Proposal</h3>
                    <div className="space-y-2">
                      <Label htmlFor="proposalTitle">Title</Label>
                      <Input
                        id="proposalTitle"
                        value={newProposal.title}
                        onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                        placeholder="Proposal Title"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proposalContent">Content</Label>
                      <Textarea
                        id="proposalContent"
                        value={newProposal.content}
                        onChange={(e) => setNewProposal({ ...newProposal, content: e.target.value })}
                        placeholder="Proposal Content (Markdown supported)"
                        className="bg-gray-800 border-gray-700 min-h-[150px]"
                      />
                    </div>
                    <Button onClick={handleCreateProposal} disabled={isCreatingProposal || !address}>
                      {isCreatingProposal ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Create Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Transaction and Donation History</CardTitle>
                  <CardDescription className="text-gray-400">
                    View all recorded transactions and donations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTransactions ? (
                    <div className="flex items-center justify-center h-40 text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading transactions...
                    </div>
                  ) : transactions.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No transaction or donation records found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Tx ID</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Initiative</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx._id}>
                            <TableCell>{tx.type}</TableCell>
                            <TableCell>{tx.token}</TableCell>
                            <TableCell>{tx.amount}</TableCell>
                            <TableCell className="font-mono text-xs">{tx.address}</TableCell>
                            <TableCell className="font-mono text-xs">{tx.txId}</TableCell>
                            <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{tx.initiative || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="swea-claims">
              <Card>
                <CardHeader>
                  <CardTitle>Pending sWEA Claim Requests</CardTitle>
                  <CardDescription>Review and process sWEA claim requests from users.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSweaClaimRequests ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : sweaClaimRequestsError ? (
                    <div className="text-center py-6 text-red-500"><p>Error loading requests: {sweaClaimRequestsError}</p></div>
                  ) : pendingSweaClaimRequests.length === 0 ? (
                    <div className="text-center py-8"><p>No pending sWEA claim requests.</p></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Acyum ID</TableHead>
                          <TableHead>Requester Address</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Requested At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingSweaClaimRequests.map((request) => (
                          <TableRow key={request._id}>
                            <TableCell>{request.acyumId}</TableCell>
                            <TableCell className="text-xs break-all">{request.requesterAddress}</TableCell>
                            <TableCell>{request.amount} sWEA</TableCell>
                            <TableCell>{new Date(request.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-500 border-blue-500 hover:bg-blue-950"
                                onClick={() => handleProcessSweaClaim(request)}
                                disabled={isProcessing || request.status !== 'pending'}
                              >
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Process Claim"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle>Edit ACYUM ID</DialogTitle>
              <DialogDescription className="text-gray-400">Update the ACYUM ID for this user.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  value={editingUser?.username}
                  className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  value={editingUser?.email}
                  className="col-span-3 bg-gray-800 border-gray-700 text-white"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="acyumId" className="text-right text-gray-300">
                  ACYUM ID
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="acyumId"
                    value={newAcyumId}
                    onChange={(e) => setNewAcyumId(e.target.value)}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setNewAcyumId(generateAcyumId())}
                    className="border-gray-700 text-gray-300"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="bg-[#FF6B35] hover:bg-[#E85A2A]" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayoutWrapper>
  )
}

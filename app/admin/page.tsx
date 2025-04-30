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
  const [treasuryBalance, setTreasuryBalance] = useState("0")
  const [faucetBalance, setFaucetBalance] = useState("0")
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [faucetAmount, setFaucetAmount] = useState("")
  const [isTreasuryLoading, setIsTreasuryLoading] = useState(false)

  // sWEA Treasury management states
  const [sweaTreasuryBalance, setSweaTreasuryBalance] = useState("0")
  const [sweaDepositAmount, setSweaDepositAmount] = useState("")
  const [withdrawSweaAmount, setWithdrawSweaAmount] = useState("")
  const [isSweaTreasuryLoading, setIsSweaTreasuryLoading] = useState(false)
  const [isSweaProcessing, setIsSweaProcessing] = useState(false)

  const isConnected = connectionStatus === 'connected' && !!account?.address
  const address = account?.address
  const sweaBankAddress = config.treasury.sweaBank
  const sweaTokenId = config.alephium.sweaTokenIdHex
  const sweaDecimals = config.alephium.sweaDecimals

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
      setUsers(usersData.users)

      const approvalsResponse = await fetch("/api/admin/pending-approvals", { headers })
      if (!approvalsResponse.ok) {
        throw new Error("Failed to fetch pending approvals")
      }
      const approvalsData = await approvalsResponse.json()
      setPendingApprovals(approvalsData.pendingApprovals)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
    } finally {
      // Keep isLoading false until all data (users, approvals, treasuries) is loaded in checkAdminStatus
      // setIsLoading(false) // Removed from here
    }
  }, [address, toast])

  // Define fetch functions *before* the main useEffect that uses them
  const fetchTreasuryData = useCallback(async () => {
    setIsTreasuryLoading(true)
    try {
      const treasuryBalanceResult = await getTreasuryBalance()
      if (treasuryBalanceResult.success) {
        setTreasuryBalance(treasuryBalanceResult.balance)
      }

      const faucetBalanceResult = await getFaucetBalance()
      if (faucetBalanceResult.success) {
        setFaucetBalance(faucetBalanceResult.balance)
      }
    } catch (error) {
      console.error("Error fetching treasury data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch treasury data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTreasuryLoading(false)
    }
  }, [toast])

  const fetchSweaTreasuryData = useCallback(async () => {
    if (!sweaBankAddress || !sweaTokenId) {
      console.warn("sWEA Bank address or Token ID not configured. Skipping sWEA balance fetch.");
      setSweaTreasuryBalance("N/A");
      return;
    }
    setIsSweaTreasuryLoading(true)
    try {
      // Call the server action to get sWEA balance
      const sweaBalanceResult = await getSweaBalanceAction(sweaBankAddress)
      if (sweaBalanceResult.success) {
        setSweaTreasuryBalance(sweaBalanceResult.balance)
      } else {
        setSweaTreasuryBalance("Error");
        toast({ title: "Error", description: sweaBalanceResult.error || "Failed to fetch sWEA treasury balance.", variant: "destructive"})
      }
    } catch (error) {
      console.error("Error fetching sWEA treasury data:", error)
      setSweaTreasuryBalance("Error");
      toast({
        title: "Error",
        description: "Failed to fetch sWEA treasury data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSweaTreasuryLoading(false)
    }
  }, [sweaBankAddress, sweaTokenId, toast]) // Added dependencies

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsLoading(true) // Set loading true at the start
      if (!isConnected || !address) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      // Check admin address from config
      if (address.toLowerCase() === config.alephium.adminAddress.toLowerCase()) {
        setIsAdmin(true)
        // Fetch all data sequentially now
        await fetchData() // Fetch users/approvals
        await fetchTreasuryData() // Fetch ALPH treasury/faucet
        await fetchSweaTreasuryData() // Fetch sWEA treasury
      } else {
        setIsAdmin(false)
      }
      setIsLoading(false) // Set loading false after all checks/fetches
    }

    checkAdminStatus()
  }, [isConnected, address, toast, fetchData, fetchSweaTreasuryData, fetchTreasuryData]) // Keep fetchData in dependency array

  const handleAddFundsToTreasury = useCallback(async () => {
    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await addFundsToTreasury(depositAmount)
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully added ${depositAmount} ALPH to the treasury`,
          variant: "default",
        })
        setDepositAmount("")
        await fetchTreasuryData()
      } else {
        throw new Error(result.error || "Failed to add funds")
      }
    } catch (error) {
      console.error("Error adding funds to treasury:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add funds to treasury",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [depositAmount, address, toast, fetchTreasuryData]) // Added dependencies

  const handleWithdrawFromTreasury = useCallback(async () => {
    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await withdrawFromTreasury(withdrawAmount)
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully withdrew ${withdrawAmount} ALPH from the treasury`,
          variant: "default",
        })
        setWithdrawAmount("")
        await fetchTreasuryData()
      } else {
        throw new Error(result.error || "Failed to withdraw funds")
      }
    } catch (error) {
      console.error("Error withdrawing from treasury:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to withdraw from treasury",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [withdrawAmount, address, toast, fetchTreasuryData]) // Added dependencies

  const handleAddFundsToFaucet = useCallback(async () => {
    if (!faucetAmount || Number.parseFloat(faucetAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to add to the faucet",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await addFundsToFaucet(faucetAmount)
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully added ${faucetAmount} ALPH to the token faucet`,
          variant: "default",
        })
        setFaucetAmount("")
        await fetchTreasuryData()
      } else {
        throw new Error(result.error || "Failed to add funds to faucet")
      }
    } catch (error) {
      console.error("Error adding funds to faucet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add funds to faucet",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }, [faucetAmount, address, toast, fetchTreasuryData]) // Added dependencies

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
      setTimeout(fetchSweaTreasuryData, 5000);

    } catch (error) {
      logger.error("Error submitting sWEA deposit transaction:", error)
      toast({ title: "Deposit Error", description: error instanceof Error ? error.message : "Failed to submit sWEA deposit", variant: "destructive" })
    } finally {
      setIsSweaProcessing(false)
    }
  }, [sweaDepositAmount, sweaBankAddress, sweaTokenId, sweaDecimals, signer, address, toast, fetchSweaTreasuryData]) // Added dependencies

  const handleWithdrawSweaFromTreasury = useCallback(async () => {
    // --- Keeping Placeholder Logic --- 
    // As discussed, secure withdrawal from a basic address via UI is not feasible without keys/contract.
    console.warn("withdrawSweaFromTreasury simulation running - NOT IMPLEMENTED SECURELY");
    toast({ title: "Not Implemented", description: "Withdrawal from treasury requires a specific contract setup for security.", variant: "destructive" });
    // --- End Placeholder --- 

    // Original placeholder simulation (can be removed or kept for UI testing)
    /*
    if (!withdrawSweaAmount || Number.parseFloat(withdrawSweaAmount) <= 0) return toast({ title: "Invalid amount", variant: "destructive" })
    if (!sweaBankAddress || !sweaTokenId) return toast({ title: "sWEA Config Error", description: "sWEA Bank address or Token ID not configured.", variant: "destructive" })
    if (!signer) return toast({ title: "Wallet Error", description: "Signer not available.", variant: "destructive" })

    setIsSweaProcessing(true)
    try {
       console.warn("withdrawSweaFromTreasury simulation running");
       await new Promise(resolve => setTimeout(resolve, 1500)); 
       const result = { success: true, txId: "simulated_tx_id_withdraw_swea" }; 
       if (result.success) {
        toast({ title: "Success (Simulated)", description: `sWEA withdrawal submitted (Tx: ${result.txId})`, variant: "default" })
        setWithdrawSweaAmount("")
        setTimeout(fetchSweaTreasuryData, 3000); 
      } else {
        throw new Error("Simulated failure or missing error message") 
      }
    } catch (error) {
      console.error("Error withdrawing sWEA from treasury:", error)
      toast({ title: "Error (Simulated)", description: error instanceof Error ? error.message : "Failed to withdraw sWEA from treasury", variant: "destructive" })
    } finally {
      setIsSweaProcessing(false)
    }
    */
  }, [withdrawSweaAmount, sweaBankAddress, sweaTokenId, signer, toast, fetchSweaTreasuryData]) // Dependencies kept for consistency if simulation is uncommented

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="alph_treasury">ALPH Treasury</TabsTrigger>
              <TabsTrigger value="swea_treasury">sWEA Treasury</TabsTrigger>
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

            <TabsContent value="alph_treasury">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    ALPH Treasury Management
                  </CardTitle>
                  <CardDescription>
                    Manage funds in the main ACYUM treasury.
                  </CardDescription>
                  <div className="flex items-center gap-2 pt-2">
                    <span>Refresh Balance:</span>
                    <Button onClick={fetchTreasuryData} variant="outline" size="sm" disabled={isTreasuryLoading}>
                      {isTreasuryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Communist Treasury</p>
                    <p className="text-2xl font-bold">{treasuryBalance} ALPH</p>
                    <p className="text-xs text-muted-foreground break-all">Address: {config.treasury.communist || "Not Set"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Token Faucet</p>
                    <p className="text-2xl font-bold">{faucetBalance} ALPH</p>
                     <p className="text-xs text-muted-foreground break-all">Address: {config.treasury.communist || "Not Set"} (Assuming same)</p>
                  </div>

                  <Card className="bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Deposit ALPH to Treasury</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="ALPH Amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={isProcessing}
                      />
                      <Button onClick={handleAddFundsToTreasury} disabled={isProcessing || !depositAmount}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />} Deposit
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Withdraw ALPH from Treasury</CardTitle>
                      <CardDescription>Requires treasury contract interaction or private key.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="ALPH Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        disabled={isProcessing}
                      />
                      <Button onClick={handleWithdrawFromTreasury} disabled={isProcessing || !withdrawAmount}>
                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />} Withdraw
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-background/50">
                    <CardHeader>
                       <CardTitle className="text-lg">Add ALPH to Faucet</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="ALPH Amount"
                        value={faucetAmount}
                        onChange={(e) => setFaucetAmount(e.target.value)}
                        disabled={isProcessing}
                      />
                      <Button onClick={handleAddFundsToFaucet} disabled={isProcessing || !faucetAmount}>
                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />} Fund Faucet
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="swea_treasury">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    sWEA Bank Treasury Management
                     <Image src="/IMG_5086_Original.jpg" alt="sWEA" width={24} height={24} className="rounded-full ml-2" />
                  </CardTitle>
                  <CardDescription>
                    Manage sWEA balance in the dedicated bank treasury address.
                    {!sweaBankAddress && <span className="text-red-500 block"> sWEA Bank Treasury address not set in config!</span>}
                    {!sweaTokenId && <span className="text-red-500 block"> sWEA Token ID not set in config!</span>}
                  </CardDescription>
                   <div className="flex items-center gap-2 pt-2">
                    <span>Refresh Balance:</span>
                    <Button onClick={fetchSweaTreasuryData} variant="outline" size="sm" disabled={isSweaTreasuryLoading || !sweaBankAddress || !sweaTokenId}>
                      {isSweaTreasuryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">sWEA Bank Treasury</p>
                    <p className="text-2xl font-bold">{sweaTreasuryBalance} sWEA</p>
                    <p className="text-xs text-muted-foreground break-all">Address: {sweaBankAddress || "Not Set"}</p>
                  </div>

                  <Card className="bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5"/>Deposit sWEA to Bank Treasury</CardTitle>
                      <CardDescription>Send sWEA from your admin wallet to the bank treasury.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="sWEA Amount"
                        value={sweaDepositAmount}
                        onChange={(e) => setSweaDepositAmount(e.target.value)}
                        disabled={isSweaProcessing || !sweaBankAddress || !sweaTokenId}
                      />
                      <Button onClick={handleAddSweaToTreasury} disabled={isSweaProcessing || !sweaDepositAmount || !sweaBankAddress || !sweaTokenId}>
                        {isSweaProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />} Deposit sWEA
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-background/50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5"/>Withdraw sWEA from Bank Treasury</CardTitle>
                      <CardDescription>Requires treasury contract interaction or private key (if treasury is a basic address). Assumes a withdrawal mechanism exists.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="sWEA Amount"
                        value={withdrawSweaAmount}
                        onChange={(e) => setWithdrawSweaAmount(e.target.value)}
                        disabled={isSweaProcessing || !withdrawSweaAmount || !sweaBankAddress || !sweaTokenId}
                      />
                      <Button onClick={handleWithdrawSweaFromTreasury} disabled={isSweaProcessing || !withdrawSweaAmount || !sweaBankAddress || !sweaTokenId}>
                         {isSweaProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />} Withdraw sWEA
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </main>
        <Footer />

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

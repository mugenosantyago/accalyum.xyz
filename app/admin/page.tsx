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

interface User {
  _id: string
  address: string
  username: string
  email: string
  acyumId?: string
  createdAt: string
}

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

export default function AdminPage() {
  const { account, connectionStatus } = useWallet()
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

  const isConnected = connectionStatus === 'connected' && !!account?.address
  const address = account?.address

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsLoading(true)
      if (!isConnected || !address) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      if (address.toLowerCase() === config.alephium.adminAddress.toLowerCase()) {
        setIsAdmin(true)
        await fetchData()
      } else {
        setIsAdmin(false)
      }
      setIsLoading(false)
    }

    checkAdminStatus()
  }, [isConnected, address, toast, fetchData])

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
      setIsLoading(false)
    }
  }, [address, toast])

  const fetchTreasuryData = async () => {
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
  }

  const handleAddFundsToTreasury = async () => {
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
  }

  const handleWithdrawFromTreasury = async () => {
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
  }

  const handleAddFundsToFaucet = async () => {
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
  }

  const handleApprove = async (id: string) => {
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
  }

  const handleReject = async (id: string) => {
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
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewAcyumId(user.acyumId || "")
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
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
  }

  const handleDeleteUser = async (id: string) => {
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
  }

  const handleCreateUser = async () => {
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
  }

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
              <Button className="bg-[#FF6B35] hover:bg-[#E85A2A]" onClick={() => connect()}>
                Connect Wallet
              </Button>
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
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow container mx-auto py-12 px-4 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#FF6B35] hover:bg-[#E85A2A] flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription className="text-gray-400">Create a new user with an ACYUM ID.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right text-gray-300">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right text-gray-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="address" className="text-right text-gray-300">
                      Wallet Address
                    </Label>
                    <Input
                      id="address"
                      value={newUserData.address}
                      onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })}
                      className="col-span-3 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="acyumId" className="text-right text-gray-300">
                      ACYUM ID
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="acyumId"
                        value={newUserData.acyumId}
                        onChange={(e) => setNewUserData({ ...newUserData, acyumId: e.target.value })}
                        className="flex-1 bg-gray-800 border-gray-700 text-white"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setNewUserData({ ...newUserData, acyumId: generateAcyumId() })}
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
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-700 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    className="bg-[#FF6B35] hover:bg-[#E85A2A]"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="approvals">
          <TabsList className="mb-6 bg-gray-800">
            <TabsTrigger value="approvals" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white">
              Pending Approvals
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white">
              Registered Users
            </TabsTrigger>
            <TabsTrigger value="treasury" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white">
              Treasury Management
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="treasury">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Treasury Management</CardTitle>
                  <CardDescription className="text-gray-400">Manage funds in the main ACYUM treasury.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-white">Current Treasury Balance</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTreasuryData}
                        disabled={isTreasuryLoading}
                        className="border-gray-700 text-gray-300"
                      >
                        {isTreasuryLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-2xl font-bold text-[#FF6B35]">
                      {Number.parseFloat(treasuryBalance).toFixed(4)} ALPH
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="depositAmount" className="text-gray-300">
                        Deposit Amount (ALPH)
                      </Label>
                      <div className="flex mt-1 gap-2">
                        <Input
                          id="depositAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Button
                          onClick={handleAddFundsToTreasury}
                          className="bg-[#FF6B35] hover:bg-[#E85A2A] whitespace-nowrap"
                          disabled={isProcessing || !depositAmount}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ArrowDown className="h-4 w-4 mr-2" />
                          )}
                          Deposit
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="withdrawAmount" className="text-gray-300">
                        Withdraw Amount (ALPH)
                      </Label>
                      <div className="flex mt-1 gap-2">
                        <Input
                          id="withdrawAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Button
                          onClick={handleWithdrawFromTreasury}
                          className="bg-[#FF6B35] hover:bg-[#E85A2A] whitespace-nowrap"
                          disabled={isProcessing || !withdrawAmount}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ArrowUp className="h-4 w-4 mr-2" />
                          )}
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Token Faucet Management</CardTitle>
                  <CardDescription className="text-gray-400">Add funds to the ACYUM token faucet.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-white">Current Faucet Balance</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTreasuryData}
                        disabled={isTreasuryLoading}
                        className="border-gray-700 text-gray-300"
                      >
                        {isTreasuryLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-2xl font-bold text-[#FF6B35]">
                      {Number.parseFloat(faucetBalance).toFixed(4)} ACYUM
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="faucetAmount" className="text-gray-300">
                        Add Tokens to Faucet (ALPH)
                      </Label>
                      <p className="text-xs text-gray-400 mb-1">
                        ALPH will be converted to ACYUM tokens at a rate of 1:100
                      </p>
                      <div className="flex mt-1 gap-2">
                        <Input
                          id="faucetAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={faucetAmount}
                          onChange={(e) => setFaucetAmount(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                        <Button
                          onClick={handleAddFundsToFaucet}
                          className="bg-[#FF6B35] hover:bg-[#E85A2A] whitespace-nowrap"
                          disabled={isProcessing || !faucetAmount}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Coins className="h-4 w-4 mr-2" />
                          )}
                          Add Tokens
                        </Button>
                      </div>
                      {faucetAmount && (
                        <p className="text-sm text-gray-400 mt-2">
                          Will add approximately {(Number.parseFloat(faucetAmount) * 100).toFixed(2)} ACYUM tokens to
                          the faucet
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

      <Footer />
    </div>
  )
}

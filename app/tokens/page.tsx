"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { useWallet, useBalance } from "@alephium/web3-react"
import { config } from "@/lib/config"
import { ALPH_TOKEN_ID } from "@alephium/web3"

interface TokenBalance {
  symbol: string
  name: string
  balance: string
  value: string
}

function formatBigIntAmount(amount: bigint | undefined | null, decimals: number, displayDecimals: number = 4): string {
  const safeAmount = amount ?? 0n; 
  if (typeof safeAmount !== 'bigint') return "Error";
  let factor = 1n;
  try {
    if (decimals < 0 || decimals > 100) throw new Error("Invalid decimals value");
    for (let i = 0; i < decimals; i++) { factor *= 10n; }
  } catch (e) { return "Error"; }
  const integerPart = safeAmount / factor; 
  const fractionalPart = safeAmount % factor; 
  if (fractionalPart === 0n) return integerPart.toString();
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  const displayFractional = fractionalString.slice(0, displayDecimals).replace(/0+$/, '');
  return `${integerPart}${displayFractional.length > 0 ? '.' + displayFractional : ''}`;
}

export default function TokensPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [tokens, setTokens] = useState<TokenBalance[]>([])

  const {
    account,
    connectionStatus
  } = useWallet();

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;

  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoading(true);
      if (!address) {
        setTokens([]);
        setIsLoading(false)
        return
      }

      try {
        const fetchedTokens: TokenBalance[] = [];
        account?.tokenBalances?.forEach(tb => {
            let name = `Token ${tb.id.substring(0,4)}...`;
            let decimals = 18;
            let symbol = `TKN_${tb.id.substring(0,4)}`;
            
            if (tb.id === config.alephium.acyumTokenId) {
                name = "American Communist Youth Uprising Movement";
                symbol = "ACYUM";
                decimals = 7;
            }

            fetchedTokens.push({
                symbol: symbol,
                name: name, 
                balance: formatBigIntAmount(tb.amount, decimals, decimals),
                value: "0.00"
            });
        });

        setTokens(fetchedTokens)
      } catch (error) {
        console.error("Error fetching tokens:", error)
        setTokens([]);
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [address, account?.tokenBalances])

  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("yourTokens")}</h1>

          <Card>
            <CardHeader>
              <CardTitle>{t("tokenBalances")}</CardTitle>
              <CardDescription>{t("viewAllTokens")}</CardDescription>
            </CardHeader>

            <CardContent>
              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("viewYourTokens")}</p>
                  <WalletConnectDisplay />
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("noTokensFound")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("token")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead className="text-right">{t("balance")}</TableHead>
                      <TableHead className="text-right">{t("value")} (ALPH)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.symbol}>
                        <TableCell className="font-medium">{token.symbol}</TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell className="text-right">{token.balance}</TableCell>
                        <TableCell className="text-right">{token.value} ALPH</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ClientLayoutWrapper>
  )
}

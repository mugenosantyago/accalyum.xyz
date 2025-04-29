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
import { logger } from "@/lib/logger"
import type { Metadata } from 'next'
import { useToast } from "@/components/ui/use-toast"

interface CandySwapTokenData {
  id: string;
  collectionTicker: string;
  name: string;
  slug: string;
  decimals?: number;
  orderBookPrice?: number;
  totalVolume?: number;
  dailyVolume?: number;
}

interface TokenBalanceRowData {
  id: string;
  symbol: string
  name: string
  balance: string
  balanceRaw: bigint
  valueAlph: string
  valueUsd: string
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

// Add metadata for the Tokens page
export const metadata: Metadata = {
  title: 'Token Balances', // Uses template: "Token Balances | ACYUM"
  description: 'View your Alephium token balances, including ALPH and ACYUM, with their current estimated values in ALPH and USD.',
  keywords: ['Alephium', 'ACYUM', 'Tokens', 'Balance', 'Wallet', 'Portfolio', 'Crypto'],
};

function TokensClient() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [marketData, setMarketData] = useState<Record<string, CandySwapTokenData>>({})
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null)
  const [marketDataError, setMarketDataError] = useState<string | null>(null)
  const [tokenRows, setTokenRows] = useState<TokenBalanceRowData[]>([])

  const {
    account,
    connectionStatus
  } = useWallet();

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;

  useEffect(() => {
    const fetchMarketData = async () => {
      setMarketDataError(null);
      try {
        const [candySwapResponse, coingeckoResponse] = await Promise.all([
          fetch('https://candyswap.gg/api/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        if (!candySwapResponse.ok) throw new Error(`CandySwap API error! status: ${candySwapResponse.status}`);
        const candySwapData: CandySwapTokenData[] = await candySwapResponse.json();
        const marketDataMap: Record<string, CandySwapTokenData> = {};
        candySwapData.forEach(token => {
          if (token.collectionTicker) {
            marketDataMap[token.collectionTicker] = token;
          }
        });
        setMarketData(marketDataMap);
        logger.info("Fetched CandySwap market data for Tokens page.");

        if (!coingeckoResponse.ok) throw new Error(`CoinGecko API error! status: ${coingeckoResponse.status}`);
        const coingeckoData = await coingeckoResponse.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price for Tokens page: ${price}`);
        } else {
          throw new Error('Invalid data format from CoinGecko API');
        }
      } catch (error) {
        logger.error("Failed to fetch market data for Tokens page:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(message);
        setMarketData({});
        setAlphUsdPrice(null);
      }
    };
    fetchMarketData();
  }, []);

  useEffect(() => {
    const processUserTokens = () => {
      setIsLoading(true);
      if (!address || Object.keys(marketData).length === 0 || alphUsdPrice === null) {
        setTokenRows([]);
        if (!address || (marketDataError && Object.keys(marketData).length === 0 && alphUsdPrice === null)) {
            setIsLoading(false);
        }
        return;
      }

      try {
        const processedTokens: TokenBalanceRowData[] = [];
        account?.tokenBalances?.forEach((tb: { id: string; amount: bigint }) => {
          const tokenMarketInfo = marketData[tb.id];
          const decimals = tokenMarketInfo?.decimals ?? (tb.id === config.alephium.acyumTokenId ? 7 : 18);
          const name = tokenMarketInfo?.name ?? (tb.id === config.alephium.acyumTokenId ? "American Communist Youth Uprising Movement" : `Token ${tb.id.substring(0,4)}...`);
          const symbol = tokenMarketInfo?.slug ?? (tb.id === config.alephium.acyumTokenId ? "ACYUM" : `TKN_${tb.id.substring(0,4)}`);
          
          const balanceFormatted = formatBigIntAmount(tb.amount, decimals, decimals);
          let valueAlphFormatted = "-";
          let valueUsdFormatted = "-";

          const priceAlph = tokenMarketInfo?.orderBookPrice;
          if (typeof priceAlph === 'number' && typeof alphUsdPrice === 'number') {
            let factor = 1n;
            for(let i=0; i<decimals; i++) { factor *= 10n; }
            const balanceNumber = Number(tb.amount) / Number(factor);
            
            const valueAlph = balanceNumber * priceAlph;
            const valueUsd = valueAlph * alphUsdPrice;
            
            valueAlphFormatted = valueAlph.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
            valueUsdFormatted = valueUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }

          processedTokens.push({
            id: tb.id,
            symbol: symbol,
            name: name,
            balance: balanceFormatted,
            balanceRaw: tb.amount,
            valueAlph: valueAlphFormatted,
            valueUsd: valueUsdFormatted
          });
        });
        setTokenRows(processedTokens);
      } catch (error) {
        logger.error("Error processing user tokens:", error);
        setTokenRows([]);
      } finally {
        setIsLoading(false);
      }
    }

    processUserTokens();
  }, [address, account?.tokenBalances, marketData, alphUsdPrice, marketDataError]);

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
              ) : tokenRows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t("noTokensFound")}</p>
                </div>
              ) : marketDataError ? (
                <div className="text-center py-4 text-red-500">
                  <p>Error loading market data: {marketDataError}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("token")}</TableHead>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead className="text-right">{t("balance")}</TableHead>
                      <TableHead className="text-right">{t("value")} (ALPH)</TableHead>
                      <TableHead className="text-right">{t("value")} (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokenRows.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.symbol}</TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell className="text-right">{token.balance}</TableCell>
                        <TableCell className="text-right">{token.valueAlph}</TableCell>
                        <TableCell className="text-right">{token.valueUsd}</TableCell>
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

export default function TokensPage() {
  return <TokensClient />;
}

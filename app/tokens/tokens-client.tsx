"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { WalletConnectDisplay } from "@/components/alephium-connect-button"
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper"
import { useWallet } from "@alephium/web3-react"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import { useToast } from "@/components/ui/use-toast"

// Define ALPH Token ID constant locally
const ALPH_TOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000000";

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

// Renamed component
export default function TokensClient() {
  const { t } = useLanguage()
  const { toast } = useToast() // Keep toast if needed, or remove if not used
  const [isLoading, setIsLoading] = useState(true)
  const [marketData, setMarketData] = useState<Record<string, CandySwapTokenData>>({}) // Map token ID -> market data
  const [alphUsdPrice, setAlphUsdPrice] = useState<number | null>(null)
  const [marketDataError, setMarketDataError] = useState<string | null>(null)
  const [tokenRows, setTokenRows] = useState<TokenBalanceRowData[]>([])

  const {
    account,
    connectionStatus
  } = useWallet();

  const address = account?.address ?? null;
  const isConnected = connectionStatus === 'connected' && !!address;
  const userTokens = account?.tokenBalances ?? [];

  // Effect 1: Fetch Market Data (CandySwap & CoinGecko)
  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true); // Start loading when fetching market data
      setMarketDataError(null);
      setMarketData({}); // Clear previous market data
      setAlphUsdPrice(null); // Clear previous price
      
      try {
        const [candySwapResponse, coingeckoResponse] = await Promise.all([
          fetch('/api/candyswap/token-list'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=alephium&vs_currencies=usd')
        ]);

        // Process CandySwap Data
        if (!candySwapResponse.ok) {
          throw new Error(`CandySwap API error! status: ${candySwapResponse.status}`);
        }
        const candySwapData: CandySwapTokenData[] = await candySwapResponse.json();
        const marketDataMap: Record<string, CandySwapTokenData> = {};
        candySwapData.forEach(token => {
          if (token.id) { // Use the 'id' field from CandySwap API as the key
            marketDataMap[token.id] = token;
          }
        });
        setMarketData(marketDataMap);
        // Log the keys we actually stored from the API response
        logger.info(
          `Stored CandySwap market data for Tokens page. Keys: [${Object.keys(marketDataMap).join(', ')}]`
        );

        // Process CoinGecko Data
        if (!coingeckoResponse.ok) {
          throw new Error(`CoinGecko API error! status: ${coingeckoResponse.status}`);
        }
        const coingeckoData = await coingeckoResponse.json();
        const price = coingeckoData?.alephium?.usd;
        if (typeof price === 'number') {
          setAlphUsdPrice(price);
          logger.info(`Fetched ALPH/USD price for Tokens page: ${price}`);
        } else {
          setAlphUsdPrice(null); // Ensure price is null if fetch fails
          logger.error('Invalid or missing price data from CoinGecko API', coingeckoData);
          // We might still want to display token balances even if USD price fails
          // throw new Error('Invalid data format from CoinGecko API'); 
        }

      } catch (error) {
        logger.error("Failed to fetch market data for Tokens page:", error);
        const message = error instanceof Error ? error.message : "Failed to load market data";
        setMarketDataError(message);
        // Don't set loading false here, let the next effect handle it after processing tokens
      }
      // Loading state will be managed by the token processing effect
    };
    
    fetchMarketData();
  }, []); // Fetch market data only once on mount

  // Effect 2: Process User Tokens whenever they change or market data arrives
  useEffect(() => {
    if (!isConnected) {
      setTokenRows([]);
      setIsLoading(false); // Not connected, stop loading
      return;
    }

    // Wait until market data and price are loaded (or failed)
    if (Object.keys(marketData).length === 0 && alphUsdPrice === null && !marketDataError) {
      // Still waiting for market data fetch to complete (or fail)
      return; 
    }
    
    setIsLoading(true); // Start loading for token processing
    try {
      const processedTokens: TokenBalanceRowData[] = [];
      
      // Add ALPH balance row first
      const alphBalanceRaw = account?.balance ?? 0n;
      const alphBalanceFormatted = formatBigIntAmount(alphBalanceRaw, 18, 4);
      const alphValueUsd = alphUsdPrice !== null ? (Number(alphBalanceRaw) / 1e18 * alphUsdPrice) : null;
      processedTokens.push({
         id: ALPH_TOKEN_ID, // Use locally defined constant
         symbol: "ALPH",
         name: "Alephium",
         balance: alphBalanceFormatted,
         balanceRaw: alphBalanceRaw,
         valueAlph: alphBalanceFormatted, // Value of ALPH in ALPH is itself
         valueUsd: alphValueUsd?.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) ?? '-'
      });

      // Process other tokens
      userTokens.forEach((tb: { id: string; amount: bigint }) => {
        const tokenMarketInfo = marketData[tb.id];

        // Log if market info is missing for this token
        if (!tokenMarketInfo) {
          logger.warn(`Market info not found for token ID: ${tb.id}`);
        }

        const decimals = tokenMarketInfo?.decimals ?? (tb.id === config.alephium.acyumTokenId ? 7 : 18);
        const name = tokenMarketInfo?.name ?? (tb.id === config.alephium.acyumTokenId ? "Acyum Token" : `Token ${tb.id.substring(0,4)}...`);
        const symbol = tokenMarketInfo?.slug?.toUpperCase() ?? (tb.id === config.alephium.acyumTokenId ? "ACYUM" : `TKN_${tb.id.substring(0,4)}`);
        
        const balanceFormatted = formatBigIntAmount(tb.amount, decimals, decimals > 4 ? 4 : decimals);
        let valueAlphFormatted = "-";
        let valueUsdFormatted = "-";

        const rawOrderBookPrice = tokenMarketInfo?.orderBookPrice;

        // Calculate Value only if price data is available
        if (typeof rawOrderBookPrice === 'number' && rawOrderBookPrice > 0) { 
          try {
            const balanceNumber = Number(formatBigIntAmount(tb.amount, decimals, decimals)); // Get full precision number
            
            // Calculate ALPH per ThisToken rate
            const alphPerTokenRate = (10 ** decimals) / rawOrderBookPrice;
            const valueAlph = balanceNumber * alphPerTokenRate;
            valueAlphFormatted = valueAlph.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

            // Calculate USD value if ALPH price is available
            if (alphUsdPrice !== null) {
              const valueUsd = valueAlph * alphUsdPrice;
              valueUsdFormatted = valueUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
               valueUsdFormatted = "Price N/A";
            }
          } catch (calcError) {
             logger.error(`Error calculating value for token ${symbol} (${tb.id}):`, calcError);
             valueAlphFormatted = "Calc Error";
             valueUsdFormatted = "Calc Error";
          }
        } else if (tokenMarketInfo?.orderBookPrice !== undefined) {
           // Handle cases where price is 0 or not a number but exists
           valueAlphFormatted = "0.00";
           valueUsdFormatted = "$0.00";
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
      logger.info(`Processed ${processedTokens.length} token rows for address ${address}`);
      
    } catch (error) {
      logger.error("Error processing user tokens:", error);
      setTokenRows([]); // Clear rows on error
      // Keep existing marketDataError if it was set previously
      if (!marketDataError) {
         setMarketDataError("Error displaying token balances.");
      }
    } finally {
      setIsLoading(false); // Finished processing tokens
    }

  }, [isConnected, address, userTokens, marketData, alphUsdPrice, marketDataError]); // Added userTokens dependency

  // JSX Structure
  return (
    <ClientLayoutWrapper>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8 text-center">{t("yourTokens")}</h1>

          {/* Temporarily comment out the card content to debug navbar */}
          {/*
          <Card>
            <CardHeader>
              <CardTitle>{t("tokenBalances")}</CardTitle>
              <CardDescription>{t("viewAllTokens")}</CardDescription>
              {marketDataError && !isLoading && (
                <p className="text-sm text-red-500 pt-2">Market Data Error: {marketDataError}</p>
              )}
            </CardHeader>

            <CardContent>
              {!isConnected ? (
                <div className="text-center py-6">
                  <p className="mb-4 text-amber-600">{t("viewYourTokens")}</p>
                  <WalletConnectDisplay />
                </div>
              ) : isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
                  <span className="ml-2">Loading balances...</span>
                </div>
              ) : tokenRows.length === 0 && !marketDataError ? ( // Only show "No tokens" if no error
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
                      <TableHead className="text-right">{t("value")} (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokenRows.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.symbol}</TableCell>
                        <TableCell>{token.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{token.balance}</TableCell>
                        <TableCell className="text-right tabular-nums">{token.valueAlph}</TableCell>
                        <TableCell className="text-right tabular-nums">{token.valueUsd}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          */}
        </main>
      </div>
    </ClientLayoutWrapper>
  )
} 
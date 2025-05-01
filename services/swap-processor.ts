import { NodeProvider } from "@alephium/web3";
import { PrivateKeyWallet } from "@alephium/web3-wallet"; // Import from correct package
import { config } from "../lib/config"; // Adjust path as needed
import { logger } from "../lib/logger"; // Adjust path as needed
import { Deposit, DepositInstance, DepositTypes } from "../artifacts/ts/Deposit"; // Adjust path for compiled artifacts
import { TokenFaucet, TokenFaucetInstance } from "../artifacts/ts/TokenFaucet"; // Adjust path for compiled artifacts
import { SwapRequestStore } from "../lib/swap-store"; // Adjust path as needed
import { ISwapRequest } from "../models/SwapRequest"; // Adjust path as needed
// import { prettifyTokenAmount } from "../lib/utils"; // Remove unused import for now
import { Types } from 'mongoose'; // Import mongoose types for ObjectId

// Define DUST_AMOUNT locally
const DUST_AMOUNT = 10000n; // Standard dust amount

let nodeProvider: NodeProvider;
let depositContract: DepositInstance;
let backendWallet: PrivateKeyWallet;
let eventSubscription: any | null = null;

const ACYUM_RATE = 0.7; // 1 ALPH = 0.7 ACYUM
const SWEA_RATE = 1.0; // 1 ALPH = 1 sWEA

async function initialize() {
    logger.info("Initializing Swap Processor Service...");
    try {
        if (!config.alephium.providerUrl) {
            throw new Error("Alephium provider URL is not configured.");
        }
        if (!config.alephium.depositContractAddress) {
            throw new Error("Deposit contract address is not configured.");
        }
        if (!config.alephium.backendWalletPrivateKey) {
            throw new Error("Backend wallet private key is not configured.");
        }
        if (!config.alephium.acyumFaucetAddress || !config.alephium.sweaFaucetAddress) {
            throw new Error("One or both Faucet addresses are not configured.");
        }

        nodeProvider = new NodeProvider(config.alephium.providerUrl);
        depositContract = Deposit.at(config.alephium.depositContractAddress);
        backendWallet = new PrivateKeyWallet({ privateKey: config.alephium.backendWalletPrivateKey });

        logger.info("Swap Processor Initialized Successfully.");
        logger.info(` - Deposit Contract: ${config.alephium.depositContractAddress}`);
        logger.info(` - ACYUM Faucet: ${config.alephium.acyumFaucetAddress}`);
        logger.info(` - sWEA Faucet: ${config.alephium.sweaFaucetAddress}`);
        logger.info(` - Backend Wallet Address: ${backendWallet.address}`);

    } catch (error) {
        logger.error("Failed to initialize Swap Processor:", error);
        // Decide on retry logic or exit
        process.exit(1); // Exit if essential components fail to initialize
    }
}

function calculateTargetAmount(targetToken: 'ACYUM' | 'sWEA', depositedAlphAttos: bigint): bigint {
    const oneAlph = 10n ** 18n; // ALPH has 18 decimals

    if (targetToken === 'ACYUM') {
        const acyumDecimals = BigInt(config.alephium.acyumDecimals);
        const rateNumerator = 7n; // 0.7 represented as 7/10
        const rateDenominator = 10n;
        // amountAcyum = (depositedAlphAttos * rate * 10^acyumDecimals) / (10^alphDecimals)
        // amountAcyum = (depositedAlphAttos * (7/10) * 10^7) / (10^18)
        // amountAcyum = (depositedAlphAttos * 7 * 10^7) / (10 * 10^18)
        // amountAcyum = (depositedAlphAttos * 7 * 10^7) / (10^19)
        // To avoid potential floating point issues and precision loss, multiply first:
        const targetAmount = (depositedAlphAttos * rateNumerator * (10n ** acyumDecimals)) / (rateDenominator * oneAlph);
        return targetAmount;
    } else { // sWEA
        const sweaDecimals = BigInt(config.alephium.sweaDecimals);
        const rateNumerator = 1n; // 1/1
        const rateDenominator = 1n;
        // amountSwea = (depositedAlphAttos * rate * 10^sweaDecimals) / (10^alphDecimals)
        // amountSwea = (depositedAlphAttos * 1 * 10^9) / (10^18)
        const targetAmount = (depositedAlphAttos * rateNumerator * (10n ** sweaDecimals)) / (rateDenominator * oneAlph);
        return targetAmount;
    }
}


async function handleDepositEvent(event: DepositTypes.DepositMadeEvent) {
    const { from, amount } = event.payload;
    const depositTxId = event.txId;
    const depositedAttos = amount;

    // Use simple toString for logging BigInts
    logger.info(`DepositMade event received: From=${from}, Amount=${depositedAttos.toString()} attos, TxID=${depositTxId}`);

    // 1. Find a matching pending swap request
    let swapRequest: ISwapRequest | null = null;
    try {
        // Assuming findPendingByDepositDetails finds the oldest pending for the user
        swapRequest = await SwapRequestStore.findPendingByDepositDetails(from, depositedAttos.toString());
        if (swapRequest) {
            const requestedAlphAttos = BigInt(swapRequest.amountAlph * (10 ** 18)); // Convert requested ALPH to attos
            if (depositedAttos < requestedAlphAttos) {
                 // Log using toString()
                 logger.warn(`Deposit amount ${depositedAttos.toString()} attos is less than requested ${requestedAlphAttos.toString()} attos for swap ${swapRequest._id}. Ignoring deposit for this swap.`);
                 swapRequest = null;
            }
        }
    } catch (dbError) {
        logger.error(`Database error finding swap request for deposit ${depositTxId}:`, dbError);
        return;
    }

    if (!swapRequest) {
        logger.info(`No matching PENDING_DEPOSIT swap request found for deposit details: From=${from}, Amount=${depositedAttos.toString()} attos`);
        return;
    }

    // Assert _id type here
    const swapId = (swapRequest._id as Types.ObjectId).toString();
    logger.info(`Found matching swap request ${swapId} for deposit ${depositTxId}.`);

    // 2. Update status to PROCESSING
    try {
        const updated = await SwapRequestStore.updateRequest(swapId, {
            status: 'PROCESSING',
            depositTxId: depositTxId,
            depositAmountAttos: depositedAttos.toString()
        });
        if (!updated) {
            logger.warn(`Failed to update swap request ${swapId} status to PROCESSING. Aborting.`);
            return;
        }
        logger.info(`Swap request ${swapId} status updated to PROCESSING.`);
    } catch (dbError) {
        logger.error(`Database error updating swap request ${swapId} to PROCESSING:`, dbError);
        return; // Don't proceed if DB error
    }

    // 3. Calculate target token amount
    let targetAmount: bigint;
    let targetTokenDecimals: number;
    let faucetAddress: string;

    try {
        targetAmount = calculateTargetAmount(swapRequest.targetToken, depositedAttos);
        if (swapRequest.targetToken === 'ACYUM') {
            faucetAddress = config.alephium.acyumFaucetAddress;
            targetTokenDecimals = config.alephium.acyumDecimals;
        } else {
            faucetAddress = config.alephium.sweaFaucetAddress;
            targetTokenDecimals = config.alephium.sweaDecimals;
        }

        if (targetAmount <= 0n) {
            throw new Error(`Calculated target amount is zero or negative (${targetAmount})`);
        }

        logger.info(`Calculated ${targetAmount.toString()} smallest units of ${swapRequest.targetToken} for swap ${swapId}.`);

    } catch (calcError) {
         logger.error(`Error calculating target amount for swap ${swapId}:`, calcError);
         await SwapRequestStore.updateRequest(swapId, { status: 'FAILED', failureReason: `Calculation error: ${calcError instanceof Error ? calcError.message : calcError}` });
         return;
    }

    // 4. Call Faucet withdraw
    try {
        logger.info(`Attempting faucet withdrawal for swap ${swapId}: ${swapRequest.targetToken} to ${swapRequest.userAddress}`);
        const faucetInstance = TokenFaucet.at(faucetAddress);

        // Check faucet balance? Might be complex due to token type.
        // For now, assume faucet has funds.

        const result = await faucetInstance.transact.withdraw({
            signer: backendWallet,
            args: {
                amount: targetAmount
            },
            attoAlphAmount: DUST_AMOUNT // Required dust amount
        });

        const faucetTxId = result.txId;
        logger.info(`Faucet withdrawal successful for swap ${swapId}: TxID=${faucetTxId}`);

        // 5. Update status to COMPLETE
        await SwapRequestStore.updateRequest(swapId, {
            status: 'COMPLETE',
            faucetTxId: faucetTxId,
            amountTargetToken: targetAmount.toString()
        });
        logger.info(`Swap request ${swapId} status updated to COMPLETE.`);

    } catch (txError) {
        logger.error(`Faucet withdrawal failed for swap ${swapId}:`, txError);
        // Update status to FAILED
        await SwapRequestStore.updateRequest(swapId, {
            status: 'FAILED',
            failureReason: `Faucet transaction failed: ${txError instanceof Error ? txError.message : txError}`,
            amountTargetToken: targetAmount.toString() // Still store calculated amount
        });
    }
}

async function startListening() {
    logger.info("Starting deposit event listener...");
    try {
        // Subscribe to events
        eventSubscription = depositContract.subscribeDepositMadeEvent({
            pollingInterval: 5000,
            messageCallback: async (event: DepositTypes.DepositMadeEvent): Promise<void> => {
                await handleDepositEvent(event);
            },
            // Use 'any' for subscription parameter type
            errorCallback: (error: Error, subscription: any): Promise<void> => { // Changed type to any
                logger.error("Deposit event subscription error:", error);
                if (eventSubscription === subscription) {
                     logger.info("Attempting to restart listener after error...");
                     stopListening();
                     setTimeout(startListening, 10000);
                 }
                return Promise.resolve();
            }
        });

        logger.info("Successfully subscribed to DepositMade events.");

        // Keep the process alive (useful for standalone scripts)
        // process.stdin.resume(); // Keep Node.js process alive

    } catch (error) {
        logger.error("Failed to start deposit event listener:", error);
        // Consider retry logic
        setTimeout(startListening, 15000); // Retry after 15 seconds
    }
}

function stopListening() {
    if (eventSubscription) {
        logger.info("Stopping deposit event listener...");
        eventSubscription.unsubscribe();
        eventSubscription = null;
        logger.info("Listener stopped.");
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info("Received SIGINT. Shutting down swap processor...");
    stopListening();
    // Add any other cleanup (e.g., close DB connection if managed here)
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info("Received SIGTERM. Shutting down swap processor...");
    stopListening();
    process.exit(0);
});

// Main execution
(async () => {
    await initialize();
    await startListening();
})(); 
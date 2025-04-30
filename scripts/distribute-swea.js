// scripts/distribute-swea.js
const { web3, Project, SignerProvider, Contract, contractIdFromAddress, addressFromContractId, DUST_AMOUNT, ONE_ALPH } = require("@alephium/web3");
const { PrivateKeyWallet } = require("@alephium/web3-wallet");
const fetch = require("node-fetch"); // Use require for node-fetch v2/v3 compatibility
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// --- Configuration ---
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Load .env from root

const NODE_URL = process.env.NEXT_PUBLIC_ALEPHIUM_PROVIDER_URL || "https://node.alephium.org";
const SENDER_PRIVATE_KEY = process.env.DISTRIBUTION_WALLET_PRIVATE_KEY;
const SWEA_TOKEN_ID = process.env.NEXT_PUBLIC_SWEA_TOKEN_ID_HEX || "5d738e4fda3dab2c3edf175842df94f877f4be41b06bba553f61328b5c276300";
const SWEA_DECIMALS = parseInt(process.env.NEXT_PUBLIC_SWEA_DECIMALS || "9", 10);
const AMOUNT_TO_SEND_BASE = 999; // Amount in sWEA (human readable)
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/verified-swea-users` : "http://localhost:3000/api/verified-swea-users"; // Adjust if deployed elsewhere
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const TRACKING_FILE = path.resolve(__dirname, 'distributed_addresses.json');
const BATCH_DELAY_MS = 2000; // Delay between transactions to avoid rate limiting
const REQUIRED_CONFIRMATIONS = 1; // Number of confirmations to wait for

// Calculated amount in smallest unit
const AMOUNT_TO_SEND_ATOMIC = BigInt(AMOUNT_TO_SEND_BASE) * (10n ** BigInt(SWEA_DECIMALS));

// --- Helper Functions ---

// Load processed addresses from the tracking file
function loadProcessedAddresses() {
    try {
        if (fs.existsSync(TRACKING_FILE)) {
            const data = fs.readFileSync(TRACKING_FILE, 'utf8');
            return new Set(JSON.parse(data));
        }
    } catch (error) {
        console.error("Error loading tracking file:", error);
        // Continue with empty set if file is corrupt or unreadable
    }
    return new Set();
}

// Save processed addresses to the tracking file
function saveProcessedAddresses(processedSet) {
    try {
        fs.writeFileSync(TRACKING_FILE, JSON.stringify(Array.from(processedSet)), 'utf8');
    } catch (error) {
        console.error("Error saving tracking file:", error);
    }
}

// Fetch verified addresses from the API
async function fetchVerifiedAddresses() {
    console.log(`Fetching verified addresses from ${API_ENDPOINT}...`);
    if (!ADMIN_API_KEY) {
        throw new Error("ADMIN_API_KEY environment variable not set.");
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ADMIN_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
             console.error("API Error: Unauthorized (401). Check your ADMIN_API_KEY.");
             throw new Error("API Unauthorized");
        }
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.walletAddresses)) {
            throw new Error("Invalid API response format. Expected { walletAddresses: [...] }.");
        }
        console.log(`Received ${data.walletAddresses.length} addresses from API.`);
        return data.walletAddresses;
    } catch (error) {
        console.error("Failed to fetch addresses from API:", error);
        throw error; // Re-throw to stop the script
    }
}

// Validate Alephium address
function isValidAlephiumAddress(address) {
    try {
        web3.addressToGroup(address); // Simple validation check
        return true;
    } catch (e) {
        return false;
    }
}

// --- Main Distribution Logic ---

async function main() {
    console.log("--- Starting sWEA Distribution Script ---");

    // 1. Validate Configuration
    if (!SENDER_PRIVATE_KEY) {
        console.error("Error: DISTRIBUTION_WALLET_PRIVATE_KEY environment variable is not set.");
        return;
    }
    if (!SWEA_TOKEN_ID) {
        console.error("Error: sWEA Token ID is missing.");
        return;
    }
    if (!ADMIN_API_KEY) {
        console.error("Error: ADMIN_API_KEY environment variable is not set.");
        return;
    }

    // 2. Setup Alephium Connection and Wallet
    console.log(`Connecting to Alephium node: ${NODE_URL}`);
    web3.setCurrentNodeProvider(NODE_URL);
    const wallet = new PrivateKeyWallet({ privateKey: SENDER_PRIVATE_KEY });
    const signer = new SignerProvider(wallet);
    const senderAddress = await wallet.getSelectedAccount();
    console.log(`Sender Address: ${senderAddress}`);

    // Optional: Check ALPH balance (requires interaction, maybe skip for simple script)
    // try {
    //     const balanceResult = await web3.getAddressesAddressBalance(senderAddress);
    //     const alphBalance = BigInt(balanceResult.balance) / ONE_ALPH;
    //     console.log(`Sender ALPH Balance: ${alphBalance.toString()} ALPH`);
    //     if (BigInt(balanceResult.balance) < DUST_AMOUNT * 10n) { // Need some ALPH for gas
    //         console.warn("Warning: Sender ALPH balance is very low. Transactions might fail due to insufficient gas.");
    //     }
    // } catch (balanceError) {
    //     console.error("Could not fetch sender ALPH balance:", balanceError);
    // }


    // 3. Load State
    const processedAddresses = loadProcessedAddresses();
    console.log(`Loaded ${processedAddresses.size} previously processed addresses.`);

    // 4. Fetch Recipient List
    let recipientAddresses = [];
    try {
        recipientAddresses = await fetchVerifiedAddresses();
    } catch (fetchError) {
        console.error("Stopping script due to error fetching addresses.");
        return;
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 5. Iterate and Distribute
    console.log("--- Starting Distribution Loop ---");
    for (const recipientAddress of recipientAddresses) {
        console.log(`\nProcessing address: ${recipientAddress}`);

        // Basic sanity check
        if (!recipientAddress || typeof recipientAddress !== 'string') {
            console.warn(`Skipping invalid entry: ${recipientAddress}`);
            skippedCount++;
            continue;
        }

        // Check if already processed
        if (processedAddresses.has(recipientAddress)) {
            console.log(`Skipping already processed address: ${recipientAddress}`);
            skippedCount++;
            continue;
        }

        // Validate address format
        if (!isValidAlephiumAddress(recipientAddress)) {
             console.warn(`Skipping invalid Alephium address format: ${recipientAddress}`);
             skippedCount++;
             continue;
        }

        // Prevent sending to self
        if (recipientAddress === senderAddress) {
            console.warn(`Skipping sending to self: ${recipientAddress}`);
            skippedCount++;
            continue;
        }


        try {
            console.log(`Attempting to send ${AMOUNT_TO_SEND_BASE} sWEA to ${recipientAddress}...`);

             // Build and submit the transaction
            const tx = await Contract.transferToken(signer, {
                signerAddress: senderAddress,
                destAddress: recipientAddress,
                tokenId: SWEA_TOKEN_ID,
                amount: AMOUNT_TO_SEND_ATOMIC
            });

            console.log(`  Transaction submitted: ${tx.txId}`);
            console.log(`  Waiting for ${REQUIRED_CONFIRMATIONS} confirmation(s)...`);

            // Wait for confirmation (optional, but recommended)
            const receipt = await web3.waitForTxConfirmed(tx.txId, REQUIRED_CONFIRMATIONS, BATCH_DELAY_MS * 5); // Wait longer for confirmation
            console.log(`  Transaction confirmed! Block Hash: ${receipt.blockHash}`);


            // Mark as processed and save state
            processedAddresses.add(recipientAddress);
            saveProcessedAddresses(processedAddresses);
            successCount++;
            console.log(`Successfully sent ${AMOUNT_TO_SEND_BASE} sWEA to ${recipientAddress} (Tx: ${tx.txId})`);

        } catch (error) {
            errorCount++;
            console.error(`Error sending sWEA to ${recipientAddress}:`, error.message || error);
            // Decide if you want to stop on error or continue
            // For now, we continue but log the error
        }

        // Delay between transactions
        console.log(`Waiting ${BATCH_DELAY_MS / 1000}s before next transaction...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }

    console.log("--- Distribution Loop Finished ---");
    console.log(`Total Addresses from API: ${recipientAddresses.length}`);
    console.log(`Successfully Processed: ${successCount}`);
    console.log(`Skipped (Already Processed or Invalid): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("--- Script Finished ---");
}

// --- Run Script ---
main().catch(error => {
    console.error("\nUnhandled error in main function:", error);
    process.exit(1);
}); 
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction, { IBankTransaction } from '@/models/BankTransaction';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { NodeProvider } from '@alephium/web3';
import { TokenFaucet } from '@/artifacts/ts'; // Import the TokenFaucet artifact

// Constants from config or define directly
const YUM_TOKEN_ID = config.alephium.acyumTokenIdHex;
const S_WEA_TOKEN_ID = config.alephium.sweaTokenIdHex;
const YUM_DECIMALS = config.alephium.acyumDecimals;
const S_WEA_DECIMALS = config.alephium.sweaDecimals;

const REWARD_VALUE = 0.099;
const PROVIDER_URL = config.alephium.providerUrl; // Should be defined in your config
const BACKEND_DUST_AMOUNT = 10000n; // Default dust amount, same as DUST_AMOUNT from @alephium/web3

// Reward Faucet Addresses - using existing faucet addresses from config
const YUM_REWARD_FAUCET_ADDRESS = config.alephium.acyumFaucetAddress; // Corrected based on linter suggestion
const S_WEA_REWARD_FAUCET_ADDRESS = config.alephium.sweaFaucetAddress;   // Corrected based on linter suggestion

// Calculate reward amounts in smallest units
const REWARD_AMOUNT_YUM_SMALLEST_UNIT = BigInt(Math.floor(REWARD_VALUE * (10 ** YUM_DECIMALS)));
const REWARD_AMOUNT_SWEA_SMALLEST_UNIT = BigInt(Math.floor(REWARD_VALUE * (10 ** S_WEA_DECIMALS)));

// Helper function to calculate net balance for a specific token from transactions
function calculateNetBalance(transactions: Pick<IBankTransaction, 'token' | 'type' | 'amount'>[], tokenSymbol: 'ALPH' | 'YUM' | 'sWEA'): bigint {
  let netBalance = 0n;
  transactions.forEach(tx => {
    if (tx.token !== tokenSymbol) return;
    try {
      const amountBigInt = BigInt(tx.amount || '0');
      if (tx.type === 'deposit' || tx.type === 'interest_payout') { // Include previous payouts in balance
        netBalance += amountBigInt;
      } else if (tx.type === 'withdraw') {
        netBalance -= amountBigInt;
      }
    } catch (e) {
      logger.error('Error processing transaction amount for balance calculation:', e, { tx });
    }
  });
  return netBalance;
}

// This endpoint should be protected (e.g., by an API key or specific admin role check)
// and triggered by a scheduler (e.g., cron job).
export async function POST(request: Request) {
  // TODO: Add security check here (e.g., API key, admin check)
  // const apiKey = request.headers.get('x-api-key');
  // if (apiKey !== process.env.REWARDS_API_KEY) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  logger.info('API: Starting reward distribution process via Faucet...');

  if (!YUM_REWARD_FAUCET_ADDRESS || !S_WEA_REWARD_FAUCET_ADDRESS) {
    logger.error('Critical: Reward faucet addresses are not configured in config.alephium.acyumFaucetAddress or config.alephium.sweaFaucetAddress.');
    return NextResponse.json({ error: 'Reward faucet addresses not configured server-side.' }, { status: 500 });
  }
   if (!PROVIDER_URL) {
    logger.error('Critical: Alephium provider URL is not configured in config.alephium.providerUrl.');
    return NextResponse.json({ error: 'Alephium provider URL not configured server-side.' }, { status: 500 });
  }

  try {
    await connectToDatabase();

    // 1. Get all distinct user addresses that have had bank transactions
    const distinctAddresses = await BankTransaction.distinct('address');
    logger.info(`Found ${distinctAddresses.length} distinct addresses to process.`);

    let payoutsRecorded = 0;
    let usersEligible = 0;

    // --- On-chain transaction setup (Conceptual - requires secure signer & configured faucet) ---
    // const nodeProvider = new NodeProvider(PROVIDER_URL);
    // web3.setCurrentNodeProvider(nodeProvider);
    // const backendSigner: SignerProvider = /* Initialize your backend signer securely (e.g., Wallet.fromPrivateKey) */ ;
    // if (!backendSigner) {
    //   logger.error('Backend signer not initialized. Cannot proceed with on-chain rewards.');
    //   return NextResponse.json({ error: 'Backend signer not configured.' }, { status: 500 });
    // }
    // --- End On-chain transaction setup ---

    for (const address of distinctAddresses) {
      const userTransactions = await BankTransaction.find(
        { address: address },
        { token: 1, type: 1, amount: 1, _id: 0 }
      ).lean();

      const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
      const acyumBalance = calculateNetBalance(userTransactions, 'YUM');
      const sweaBalance = calculateNetBalance(userTransactions, 'sWEA');

      // Check eligibility: Must have a positive balance of ALPH, YUM, or sWEA
      if (alphBalance <= 0n && acyumBalance <= 0n && sweaBalance <= 0n) {
        continue; // Not eligible
      }
      usersEligible++;

      let rewardTokenSymbol: 'YUM' | 'sWEA';
      let rewardAmountSmallestUnit: bigint;
      let targetFaucetAddress: string | undefined;

      if (acyumBalance > sweaBalance) {
        rewardTokenSymbol = 'YUM';
        rewardAmountSmallestUnit = REWARD_AMOUNT_YUM_SMALLEST_UNIT;
        targetFaucetAddress = YUM_REWARD_FAUCET_ADDRESS;
      } else if (sweaBalance > acyumBalance) {
        rewardTokenSymbol = 'sWEA';
        rewardAmountSmallestUnit = REWARD_AMOUNT_SWEA_SMALLEST_UNIT;
        targetFaucetAddress = S_WEA_REWARD_FAUCET_ADDRESS;
      } else { // Equal balances (including both 0 if only ALPH is held), or only ALPH is held
        rewardTokenSymbol = 'YUM'; // Default to YUM
        rewardAmountSmallestUnit = REWARD_AMOUNT_YUM_SMALLEST_UNIT;
        targetFaucetAddress = YUM_REWARD_FAUCET_ADDRESS;
      }
      
      if (!targetFaucetAddress) {
        logger.warn(`Skipping user ${address} due to missing Faucet Address for ${rewardTokenSymbol}. YUM Faucet: ${YUM_REWARD_FAUCET_ADDRESS}, sWEA Faucet: ${S_WEA_REWARD_FAUCET_ADDRESS}`);
        continue;
      }

      // Placeholder for TxID, replace with actual on-chain TxID
      let txId = `interest_payout_faucet_${address}_${Date.now()}`;
      let onChainSuccess = false;

      // --- Actual Faucet Interaction (Conceptual - uncomment and adapt when signer is ready) ---
      /*
      try {
        logger.info(`Attempting to trigger faucet ${targetFaucetAddress} for ${REWARD_VALUE} ${rewardTokenSymbol} to ${address}`);
        
        const faucet = TokenFaucet.at(targetFaucetAddress);
        
        // IMPORTANT: The 'withdraw' method arguments of YOUR TokenFaucet contract might be different.
        // This example assumes it takes 'receiver' and 'amount'.
        // If it only takes 'amount', it sends to the signer, which is NOT what you want for backend distribution.
        // You might need a different method like 'dispense' or 'sendReward'.
        const result = await faucet.transact.withdraw({
          signer: backendSigner, // The backend's signer (must be authorized by the faucet)
          args: {
            // ENSURE YOUR FAUCET CONTRACT'S METHOD TAKES THESE ARGUMENTS
            receiver: address, // The user who gets the reward
            amount: rewardAmountSmallestUnit
          },
          attoAlphAmount: BACKEND_DUST_AMOUNT // Use defined dust amount
        });
        
        txId = result.txId;
        onChainSuccess = true;
        logger.info(`Successfully triggered faucet for ${address}: TxID ${txId}`);

      } catch (onChainError) {
        logger.error(`Failed to trigger faucet for ${address} (Token: ${rewardTokenSymbol}, Faucet: ${targetFaucetAddress}):`, onChainError);
        // Decide on error handling: skip recording, record as failed, retry, etc.
        // For now, we proceed to record with placeholder if on-chain fails, but ideally, this should be robust.
      }
      */
      // --- End Faucet Interaction ---

      // For now, we log the placeholder action and record it.
      // Once on-chain logic is active, use the actual txId and onChainSuccess status.
      logger.info(`Placeholder: Would trigger faucet ${targetFaucetAddress} for ${REWARD_VALUE} ${rewardTokenSymbol} to ${address}. TxID: ${txId}`);
      
      await BankTransaction.create({
        address: address,
        type: 'interest_payout',
        token: rewardTokenSymbol,
        amount: rewardAmountSmallestUnit.toString(),
        txId: txId, // Use actual txId if onChainSuccess is true and logic is uncommented
        timestamp: new Date(),
      });
      payoutsRecorded++;
    }

    logger.info(`Reward distribution via Faucet finished. Eligible users: ${usersEligible}, Payouts recorded: ${payoutsRecorded}`);
    return NextResponse.json({ 
      message: 'Reward distribution via Faucet finished.', 
      eligibleUsers: usersEligible,
      payoutsRecorded: payoutsRecorded 
    });

  } catch (error) {
    logger.error('API Error during reward distribution via Faucet:', error);
    return NextResponse.json({ error: 'Internal Server Error during reward distribution via Faucet' }, { status: 500 });
  }
} 
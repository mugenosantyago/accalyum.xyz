import {
  ExecuteScriptResult,
  SignerProvider,
  DUST_AMOUNT, // Keep DUST_AMOUNT if it's actually exported, otherwise define locally
  HexString,
  ALPH_TOKEN_ID
} from '@alephium/web3'
// Remove web3-script import if not used
import { TokenFaucet } from '@/artifacts/ts'

// Define the arguments required by the script execution
// Matches the pattern used by other scripts even if we call directly
export type ClaimFaucetArgs = {
  faucet: HexString; // Faucet contract address
  token: HexString; // Token ID to claim
  amount: bigint;   // Amount to claim
}

// Define the script execution function
export const ClaimFaucet = {
  // Define the 'execute' method to match the pattern of other scripts
  async execute(
    signer: SignerProvider,
    args: {
      initialFields: ClaimFaucetArgs,
      attoAlphAmount: bigint
    }
  ): Promise<ExecuteScriptResult> {

    const faucetInstance = TokenFaucet.at(args.initialFields.faucet)

    // Call the 'claim' method on the contract instance
    // Pass required arguments for the contract method via `args` field
    return faucetInstance.methods.claim({
      // Assuming the contract's 'claim' method needs the amount as an argument
      // Adjust based on the actual contract method signature in TokenFaucet.ral
      args: {
        amount: args.initialFields.amount
        // If the contract also needs the token ID or claimer address passed explicitly:
        // token: args.initialFields.token,
        // claimer: signer.address 
      },
      // Attach the necessary ALPH amount (dust)
      attoAlphAmount: args.attoAlphAmount ?? DUST_AMOUNT 
    }, { signer })
  }
}

// If DUST_AMOUNT is not exported from @alephium/web3, define it locally:
// export const DUST_AMOUNT = 10000n; 
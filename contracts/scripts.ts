import { ExecutableScript, Script, type HexString } from "@alephium/web3"
import { getContractByCodeHash } from "./contracts"
// Import executable scripts from the generated TypeScript artifacts
import { Withdraw as WithdrawFromArtifacts2 } from "../artifacts2/ts/scripts"
import MakeDepositScriptJson from "../artifacts2/MakeDeposit.ral.json"
import WithdrawScriptJson from "../artifacts2/Withdraw.ral.json"

// The executable script instances are now imported directly
// export const MakeDeposit = new ExecutableScript<{
//   depositContract: HexString
//   amount: bigint
// }>(Script.fromJson(MakeDepositScriptJson, "", []), getContractByCodeHash)

// export const Withdraw = new ExecutableScript<{
//   token: HexString
//   amount: bigint
// }>(Script.fromJson(WithdrawScriptJson, "", []), getContractByCodeHash)

// Correctly define and export the MakeDeposit executable script
export const MakeDeposit = new ExecutableScript<{
  depositContract: HexString
  account: HexString
  bank: HexString
  attoAlphAmount: bigint
}>(Script.fromJson(MakeDepositScriptJson, "", []), getContractByCodeHash)

// Export the imported Withdraw instance
export const Withdraw = WithdrawFromArtifacts2;

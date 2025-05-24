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

export const MakeDeposit = // Need to define/import MakeDeposit correctly

// Export the imported Withdraw instance
export const Withdraw = WithdrawFromArtifacts2;

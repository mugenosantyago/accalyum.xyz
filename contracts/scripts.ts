import { ExecutableScript, Script, type HexString } from "@alephium/web3"
import { getContractByCodeHash } from "./contracts"
import MakeDepositScriptJson from "./MakeDeposit.ral.json"
import WithdrawScriptJson from "./Withdraw.ral.json"

export const MakeDeposit = new ExecutableScript<{
  depositContract: HexString
  amount: bigint
}>(Script.fromJson(MakeDepositScriptJson, "", []), getContractByCodeHash)

export const Withdraw = new ExecutableScript<{
  token: HexString
  amount: bigint
}>(Script.fromJson(WithdrawScriptJson, "", []), getContractByCodeHash)

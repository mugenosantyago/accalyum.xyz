import {
  type Address,
  Contract,
  type ContractState,
  type HexString,
  ContractFactory,
  type EventSubscribeOptions,
  type EventSubscription,
  type CallContractParams,
  type CallContractResult,
  type ContractEvent,
  subscribeContractEvent,
  testMethod,
  callMethod,
  multicallMethods,
  fetchContractState,
  type Asset,
  ContractInstance,
  getContractEventsCurrentCount,
  type TestContractParamsWithoutMaps,
  type TestContractResultWithoutMaps,
  type SignExecuteContractMethodParams,
  type SignExecuteScriptTxResult,
  signExecuteMethod,
  addStdIdToFields,
  encodeContractFields,
  type Narrow,
} from "@alephium/web3"
import TokenFaucetContractJson from "./TokenFaucet.ral.json"
import { getContractByCodeHash, registerContract } from "./contracts"

// Custom types for the contract
export namespace TokenFaucetTypes {
  export type Fields = {
    symbol: HexString
    name: HexString
    decimals: bigint
    supply: bigint
    balance: bigint
  }

  export type State = ContractState<Fields>

  export type WithdrawEvent = ContractEvent<{ to: Address; amount: bigint }>

  export interface CallMethodTable {
    getSymbol: {
      params: Omit<CallContractParams<{}>, "args">
      result: CallContractResult<HexString>
    }
    getName: {
      params: Omit<CallContractParams<{}>, "args">
      result: CallContractResult<HexString>
    }
    getDecimals: {
      params: Omit<CallContractParams<{}>, "args">
      result: CallContractResult<bigint>
    }
    getTotalSupply: {
      params: Omit<CallContractParams<{}>, "args">
      result: CallContractResult<bigint>
    }
    balance: {
      params: Omit<CallContractParams<{}>, "args">
      result: CallContractResult<bigint>
    }
    withdraw: {
      params: CallContractParams<{ amount: bigint }>
      result: CallContractResult<null>
    }
  }
  export type CallMethodParams<T extends keyof CallMethodTable> = CallMethodTable[T]["params"]
  export type CallMethodResult<T extends keyof CallMethodTable> = CallMethodTable[T]["result"]
  export type MultiCallParams = Partial<{
    [Name in keyof CallMethodTable]: CallMethodTable[Name]["params"]
  }>
  export type MultiCallResults<T extends MultiCallParams> = {
    [MaybeName in keyof T]: MaybeName extends keyof CallMethodTable ? CallMethodTable[MaybeName]["result"] : undefined
  }
  export type MulticallReturnType<Callss extends MultiCallParams[]> = {
    [index in keyof Callss]: MultiCallResults<Callss[index]>
  }

  export interface SignExecuteMethodTable {
    getSymbol: {
      params: Omit<SignExecuteContractMethodParams<{}>, "args">
      result: SignExecuteScriptTxResult
    }
    getName: {
      params: Omit<SignExecuteContractMethodParams<{}>, "args">
      result: SignExecuteScriptTxResult
    }
    getDecimals: {
      params: Omit<SignExecuteContractMethodParams<{}>, "args">
      result: SignExecuteScriptTxResult
    }
    getTotalSupply: {
      params: Omit<SignExecuteContractMethodParams<{}>, "args">
      result: SignExecuteScriptTxResult
    }
    balance: {
      params: Omit<SignExecuteContractMethodParams<{}>, "args">
      result: SignExecuteScriptTxResult
    }
    withdraw: {
      params: SignExecuteContractMethodParams<{ amount: bigint }>
      result: SignExecuteScriptTxResult
    }
  }
  export type SignExecuteMethodParams<T extends keyof SignExecuteMethodTable> = SignExecuteMethodTable[T]["params"]
  export type SignExecuteMethodResult<T extends keyof SignExecuteMethodTable> = SignExecuteMethodTable[T]["result"]
}

class Factory extends ContractFactory<TokenFaucetInstance, TokenFaucetTypes.Fields> {
  encodeFields(fields: TokenFaucetTypes.Fields) {
    return encodeContractFields(addStdIdToFields(this.contract, fields), this.contract.fieldsSig, [])
  }

  eventIndex = { Withdraw: 0 }
  consts = { ErrorCodes: { InvalidWithdrawAmount: BigInt("0") } }

  at(address: string): TokenFaucetInstance {
    return new TokenFaucetInstance(address)
  }

  tests = {
    getSymbol: async (
      params: Omit<TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, never>, "testArgs">,
    ): Promise<TestContractResultWithoutMaps<HexString>> => {
      return testMethod(this, "getSymbol", params, getContractByCodeHash)
    },
    getName: async (
      params: Omit<TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, never>, "testArgs">,
    ): Promise<TestContractResultWithoutMaps<HexString>> => {
      return testMethod(this, "getName", params, getContractByCodeHash)
    },
    getDecimals: async (
      params: Omit<TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, never>, "testArgs">,
    ): Promise<TestContractResultWithoutMaps<bigint>> => {
      return testMethod(this, "getDecimals", params, getContractByCodeHash)
    },
    getTotalSupply: async (
      params: Omit<TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, never>, "testArgs">,
    ): Promise<TestContractResultWithoutMaps<bigint>> => {
      return testMethod(this, "getTotalSupply", params, getContractByCodeHash)
    },
    balance: async (
      params: Omit<TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, never>, "testArgs">,
    ): Promise<TestContractResultWithoutMaps<bigint>> => {
      return testMethod(this, "balance", params, getContractByCodeHash)
    },
    withdraw: async (
      params: TestContractParamsWithoutMaps<TokenFaucetTypes.Fields, { amount: bigint }>,
    ): Promise<TestContractResultWithoutMaps<null>> => {
      return testMethod(this, "withdraw", params, getContractByCodeHash)
    },
  }

  stateForTest(initFields: TokenFaucetTypes.Fields, asset?: Asset, address?: string) {
    return this.stateForTest_(initFields, asset, address, undefined)
  }
}

// Use this object to test and deploy the contract
export const TokenFaucet = new Factory(
  Contract.fromJson(
    TokenFaucetContractJson,
    "",
    "2a9688f6e9659b2561e18bfbdd7b09dfc23abe8630f1a871754a4a017cba0489",
    [],
  ),
)
registerContract(TokenFaucet)

// Use this class to interact with the blockchain
export class TokenFaucetInstance extends ContractInstance {
  constructor(address: Address) {
    super(address)
  }

  async fetchState(): Promise<TokenFaucetTypes.State> {
    return fetchContractState(TokenFaucet, this)
  }

  async getContractEventsCurrentCount(): Promise<number> {
    return getContractEventsCurrentCount(this.address)
  }

  subscribeWithdrawEvent(
    options: EventSubscribeOptions<TokenFaucetTypes.WithdrawEvent>,
    fromCount?: number,
  ): EventSubscription {
    return subscribeContractEvent(TokenFaucet.contract, this, options, "Withdraw", fromCount)
  }

  view = {
    getSymbol: async (
      params?: TokenFaucetTypes.CallMethodParams<"getSymbol">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"getSymbol">> => {
      return callMethod(TokenFaucet, this, "getSymbol", params === undefined ? {} : params, getContractByCodeHash)
    },
    getName: async (
      params?: TokenFaucetTypes.CallMethodParams<"getName">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"getName">> => {
      return callMethod(TokenFaucet, this, "getName", params === undefined ? {} : params, getContractByCodeHash)
    },
    getDecimals: async (
      params?: TokenFaucetTypes.CallMethodParams<"getDecimals">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"getDecimals">> => {
      return callMethod(TokenFaucet, this, "getDecimals", params === undefined ? {} : params, getContractByCodeHash)
    },
    getTotalSupply: async (
      params?: TokenFaucetTypes.CallMethodParams<"getTotalSupply">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"getTotalSupply">> => {
      return callMethod(TokenFaucet, this, "getTotalSupply", params === undefined ? {} : params, getContractByCodeHash)
    },
    balance: async (
      params?: TokenFaucetTypes.CallMethodParams<"balance">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"balance">> => {
      return callMethod(TokenFaucet, this, "balance", params === undefined ? {} : params, getContractByCodeHash)
    },
    withdraw: async (
      params: TokenFaucetTypes.CallMethodParams<"withdraw">,
    ): Promise<TokenFaucetTypes.CallMethodResult<"withdraw">> => {
      return callMethod(TokenFaucet, this, "withdraw", params, getContractByCodeHash)
    },
  }

  transact = {
    getSymbol: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"getSymbol">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"getSymbol">> => {
      return signExecuteMethod(TokenFaucet, this, "getSymbol", params)
    },
    getName: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"getName">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"getName">> => {
      return signExecuteMethod(TokenFaucet, this, "getName", params)
    },
    getDecimals: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"getDecimals">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"getDecimals">> => {
      return signExecuteMethod(TokenFaucet, this, "getDecimals", params)
    },
    getTotalSupply: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"getTotalSupply">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"getTotalSupply">> => {
      return signExecuteMethod(TokenFaucet, this, "getTotalSupply", params)
    },
    balance: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"balance">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"balance">> => {
      return signExecuteMethod(TokenFaucet, this, "balance", params)
    },
    withdraw: async (
      params: TokenFaucetTypes.SignExecuteMethodParams<"withdraw">,
    ): Promise<TokenFaucetTypes.SignExecuteMethodResult<"withdraw">> => {
      return signExecuteMethod(TokenFaucet, this, "withdraw", params)
    },
  }

  async multicall<Calls extends TokenFaucetTypes.MultiCallParams>(
    calls: Calls,
  ): Promise<TokenFaucetTypes.MultiCallResults<Calls>>
  async multicall<Callss extends TokenFaucetTypes.MultiCallParams[]>(
    callss: Narrow<Callss>,
  ): Promise<TokenFaucetTypes.MulticallReturnType<Callss>>
  async multicall<Callss extends TokenFaucetTypes.MultiCallParams | TokenFaucetTypes.MultiCallParams[]>(
    callss: Callss,
  ): Promise<unknown> {
    return await multicallMethods(TokenFaucet, this, callss, getContractByCodeHash)
  }
}

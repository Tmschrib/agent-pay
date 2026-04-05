declare module "@dynamic-labs-wallet/node-evm" {
  import { Chain, WalletClient, Transport, Account } from "viem"

  export class DynamicEvmWalletClient {
    constructor(options: { environmentId: string })
    authenticateApiToken(token: string): Promise<void>
    createWalletAccount(options: {
      thresholdSignatureScheme: string
      password?: string
      backUpToClientShareService?: boolean
    }): Promise<{ accountAddress: string }>
    getWalletClient(options: {
      accountAddress: string
      chain: Chain
      password?: string
    }): Promise<WalletClient<Transport, Chain, Account>>
  }
}

declare module "@dynamic-labs-wallet/node" {
  export const ThresholdSignatureScheme: {
    TWO_OF_TWO: string
  }
}

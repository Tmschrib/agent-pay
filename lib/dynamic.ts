import { DynamicEvmWalletClient } from "@dynamic-labs-wallet/node-evm"
import { ThresholdSignatureScheme } from "@dynamic-labs-wallet/node"
import { baseSepolia } from "viem/chains"

let evmClient: DynamicEvmWalletClient | null = null

async function getEvmClient(): Promise<DynamicEvmWalletClient> {
  if (evmClient) return evmClient
  evmClient = new DynamicEvmWalletClient({
    environmentId: process.env.DYNAMIC_ENVIRONMENT_ID!,
  })
  await evmClient.authenticateApiToken(process.env.DYNAMIC_AUTH_TOKEN!)
  return evmClient
}

export async function getOrCreateAgentWallet(agentId: string) {
  const client = await getEvmClient()

  const wallet = await client.createWalletAccount({
    thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
  })

  const walletClient = await client.getWalletClient({
    accountAddress: wallet.accountAddress,
    chain: baseSepolia,
  })

  return {
    accountAddress: wallet.accountAddress,
    walletClient,
  }
}

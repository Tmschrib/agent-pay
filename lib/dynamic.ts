import { DynamicEvmWalletClient } from "@dynamic-labs-wallet/node-evm"
import { ThresholdSignatureScheme } from "@dynamic-labs-wallet/node"
import { baseSepolia } from "viem/chains"
import { getAgent, setAgent } from "./store"

let evmClient: DynamicEvmWalletClient | null = null

const WALLET_PASSWORD = process.env.DYNAMIC_WALLET_PASSWORD || "agent-pay-default-key"

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
  const existingAddress = await getAgent(agentId)

  let accountAddress: string

  if (existingAddress) {
    // Existing agent — reuse wallet
    accountAddress = existingAddress
  } else {
    // New agent — create wallet with backup enabled
    const wallet = await client.createWalletAccount({
      thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
      password: WALLET_PASSWORD,
      backUpToClientShareService: true,
    })
    accountAddress = wallet.accountAddress
    await setAgent(agentId, accountAddress)
  }

  const walletClient = await client.getWalletClient({
    accountAddress,
    chain: baseSepolia,
    password: WALLET_PASSWORD,
  })

  return {
    accountAddress,
    walletClient,
  }
}

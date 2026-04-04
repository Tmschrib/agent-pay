import { DynamicEvmWalletClient } from "@dynamic-labs-wallet/node-evm"
import { ThresholdSignatureScheme } from "@dynamic-labs-wallet/node"
import { baseSepolia } from "viem/chains"
import fs from "fs"
import path from "path"

let evmClient: DynamicEvmWalletClient | null = null

const AGENTS_FILE = path.join(process.cwd(), "lib", "agents.json")

function loadAgents(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function saveAgent(agentId: string, address: string) {
  const agents = loadAgents()
  agents[agentId] = address
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2) + "\n")
}

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
  const agents = loadAgents()

  let accountAddress: string

  if (agents[agentId]) {
    // Existing agent — reuse wallet
    accountAddress = agents[agentId]
  } else {
    // New agent — create wallet and save
    const wallet = await client.createWalletAccount({
      thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
    })
    accountAddress = wallet.accountAddress
    saveAgent(agentId, accountAddress)
  }

  const walletClient = await client.getWalletClient({
    accountAddress,
    chain: baseSepolia,
  })

  return {
    accountAddress,
    walletClient,
  }
}

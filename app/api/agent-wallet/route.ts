import { getOrCreateAgentWallet } from "@/lib/dynamic"
import { getAgent } from "@/lib/store"

export async function POST(req: Request) {
  const { agentId, checkOnly } = await req.json()

  // Check if agent already exists
  const existingAddress = await getAgent(agentId)

  // If checkOnly and doesn't exist, return isNew without creating
  if (checkOnly && !existingAddress) {
    return Response.json({ address: null, agentId, isNew: true })
  }

  const wallet = await getOrCreateAgentWallet(agentId)
  return Response.json({
    address: wallet.accountAddress,
    agentId,
    isNew: !existingAddress,
  })
}

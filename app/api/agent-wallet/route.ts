import { getOrCreateAgentWallet } from "@/lib/dynamic"

export async function POST(req: Request) {
  const { agentId } = await req.json()
  const wallet = await getOrCreateAgentWallet(agentId)
  return Response.json({
    address: wallet.accountAddress,
    agentId,
  })
}

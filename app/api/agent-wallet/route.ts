import { getOrCreateAgentWallet } from "@/lib/dynamic"
import fs from "fs"
import path from "path"

const AGENTS_FILE = path.join(process.cwd(), "lib", "agents.json")

export async function POST(req: Request) {
  const { agentId, checkOnly } = await req.json()

  // Check if agent already exists
  let existingAddress: string | null = null
  try {
    const agents = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"))
    if (agents[agentId]) existingAddress = agents[agentId]
  } catch {
    // File doesn't exist yet
  }

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

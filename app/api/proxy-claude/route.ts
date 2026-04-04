import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const POST = withX402(
  async (req: NextRequest) => {
    const { prompt } = await req.json()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    })

    return NextResponse.json({
      result:
        message.content[0].type === "text" ? message.content[0].text : "",
      model: "claude-haiku-4-5",
      source: "claude.agent-pay.eth",
      cost_paid: "0.000010 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000010",
    network: "base-sepolia",
  }
)

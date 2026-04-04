import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const POST = withX402(
  async (req: NextRequest) => {
    const { prompt } = await req.json()

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    })

    return NextResponse.json({
      result: completion.choices[0]?.message?.content || "",
      model: "gpt-4o",
      source: "openai.agent-pay.eth",
      cost_paid: "0.000010 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000010",
    network: "base-sepolia",
  }
)

import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"

export const POST = withX402(
  async (req: NextRequest) => {
    const { prompt } = await req.json()

    const response = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    )
    const data = await response.json()

    return NextResponse.json({
      result: data.choices?.[0]?.message?.content || "",
      model: "sonar",
      source: "perplexity.agent-pay.eth",
      cost_paid: "0.000010 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000010",
    network: "base-sepolia",
  }
)

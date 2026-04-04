import { withX402Logged } from "@/lib/x402"
import { NextRequest, NextResponse } from "next/server"

export const POST = withX402Logged(
  async (req: NextRequest) => {
    const { prompt } = await req.json()

    const response = await fetch(
      "https://api.klingai.com/v1/videos/text2video",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KLING_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          duration: 5,
          quality: "standard",
        }),
      }
    )
    const data = await response.json()

    return NextResponse.json({
      result: data.result_url || data,
      model: "kling-v1",
      source: "kling.agent-pay.eth",
      cost_paid: "0.154000 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.001000",
    network: "base-sepolia",
  },
  "kling"
)

import { withX402Logged } from "@/lib/x402"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const POST = withX402Logged(
  async (req: NextRequest) => {
    const { prompt } = await req.json()

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return NextResponse.json({
      result: text,
      model: "gemini-2.0-flash",
      source: "gemini.agent-pay.eth",
      cost_paid: "0.000010 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000100",
    network: "base-sepolia",
  },
  "gemini"
)

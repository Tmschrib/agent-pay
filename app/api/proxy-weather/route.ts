import { withX402Logged } from "@/lib/x402"
import { NextRequest, NextResponse } from "next/server"

export const GET = withX402Logged(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get("city") || "Cannes"

    const apiKey = process.env.OPENWEATHERMAP_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        city: "Cannes",
        temperature: 24,
        condition: "Sunny",
        humidity: 65,
        source: "weather.agent-pay.eth",
        fallback: true,
        cost_paid: "0.000500 USDC",
      })
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    )
    const data = await response.json()

    return NextResponse.json({
      city: data.name,
      temperature: data.main.temp,
      condition: data.weather[0].description,
      humidity: data.main.humidity,
      source: "weather.agent-pay.eth",
      cost_paid: "0.000500 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000550",
    network: "base-sepolia",
  },
  "weather"
)

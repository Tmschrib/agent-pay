import { withX402Logged } from "@/lib/x402"
import { NextRequest, NextResponse } from "next/server"

export const GET = withX402Logged(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const coin = searchParams.get("coin") || "ethereum"

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { headers: { Accept: "application/json" } }
    )
    const data = await response.json()

    return NextResponse.json({
      coin,
      price_usd: data[coin]?.usd,
      change_24h: data[coin]?.usd_24h_change,
      market_cap: data[coin]?.usd_market_cap,
      source: "price.agent-pay.eth",
      powered_by: "CoinGecko",
      cost_paid: "0.000500 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000550",
    network: "base-sepolia",
  },
  "price"
)

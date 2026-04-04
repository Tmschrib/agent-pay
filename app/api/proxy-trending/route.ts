import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"

export const GET = withX402(
  async (req: NextRequest) => {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1",
      { headers: { Accept: "application/json" } }
    )
    const data = await response.json()

    const markets = data.map((coin: any) => ({
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price_usd: coin.current_price,
      change_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
    }))

    return NextResponse.json({
      top_markets: markets,
      source: "trending.agent-pay.eth",
      powered_by: "CoinGecko",
      cost_paid: "0.000300 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000330",
    network: "base-sepolia",
  }
)

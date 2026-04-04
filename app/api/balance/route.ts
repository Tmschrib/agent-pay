import { NextRequest, NextResponse } from "next/server"
import { createPublicClient, http, parseAbi } from "viem"
import { baseSepolia } from "viem/chains"

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")
  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 })
  }

  try {
    const balance = await client.readContract({
      address: USDC_ADDRESS,
      abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
      functionName: "balanceOf",
      args: [wallet as `0x${string}`],
    })

    // USDC has 6 decimals
    const formatted = (Number(balance) / 1e6).toFixed(6)

    return NextResponse.json({ balance: formatted })
  } catch {
    return NextResponse.json({ balance: "0.000000" })
  }
}

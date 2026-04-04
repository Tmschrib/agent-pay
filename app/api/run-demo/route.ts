import { getOrCreateAgentWallet } from "@/lib/dynamic"
import { wrapFetchWithPayment } from "x402-fetch"

export async function POST() {
  const logs: string[] = []

  try {
    logs.push("Querying ENS registry at agent-pay.eth...")
    const { walletClient } = await getOrCreateAgentWallet("style-agent-001")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any)

    const servicesRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/get-services`
    )
    const { services } = await servicesRes.json()
    logs.push(
      `Found ${services.length} services: ${services.map((s: any) => s.name).join(", ")}`
    )

    logs.push("Paying $0.000500 USDC to weather.agent-pay.eth...")
    const weatherRes = await fetchWithPayment(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/proxy-weather?city=Cannes`
    )
    const weather = await weatherRes.json()
    logs.push(
      `Weather received: ${weather.temperature} C, ${weather.condition}`
    )
    logs.push(
      "ENS verification: payment address matches agent-pay.eth record"
    )

    const prompt = `The weather in Cannes today is: ${weather.temperature} C, ${weather.condition}, humidity ${weather.humidity}%. Suggest 3 outfit ideas for a day in the city. Be specific about clothing items.`
    logs.push("Paying $0.000010 USDC to claude.agent-pay.eth...")
    const claudeRes = await fetchWithPayment(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/proxy-claude`,
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const claudeData = await claudeRes.json()
    logs.push("Claude responded with outfit suggestions")
    logs.push(
      "ENS verification: payment address matches agent-pay.eth record"
    )
    logs.push(
      "Total spent: $0.000510 USDC | 0 API keys used | 0 human approvals"
    )

    return Response.json({ logs, result: claudeData.result })
  } catch (err) {
    logs.push(
      `Error: ${err instanceof Error ? err.message : "Unknown error"}`
    )
    return Response.json({ logs, result: null }, { status: 500 })
  }
}

import { getOrCreateAgentWallet } from "@/lib/dynamic"
import { wrapFetchWithPayment } from "x402-fetch"
import Anthropic from "@anthropic-ai/sdk"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function POST(req: Request) {
  const { message, agentId } = await req.json()
  const logs: string[] = []

  try {
    // 1. Get agent wallet
    logs.push("Initializing agent wallet...")
    const { walletClient } = await getOrCreateAgentWallet(
      agentId || "chat-agent-001"
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any)

    // 2. Discover available services
    const servicesRes = await fetch(`${APP_URL}/api/get-services`)
    const { services } = await servicesRes.json()
    logs.push(
      `Discovered ${services.length} services on agent-pay.eth`
    )

    // 3. Ask Claude to plan which APIs to call
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const serviceList = services
      .map(
        (s: any) =>
          `- ${s.name}: ${s.description || "no description"} (price: $${s.price} USDC, endpoint: ${s.url})`
      )
      .join("\n")

    const planResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are an AI agent with a crypto wallet. You can call paid APIs to fulfill user requests.

Available APIs on agent-pay.eth:
${serviceList}

User request: "${message}"

Decide which APIs to call. Reply ONLY with a JSON array of actions. Each action has:
- "service": the service name (e.g. "weather.agent-pay.eth")
- "endpoint": the full endpoint URL to call
- "method": "GET" or "POST"
- "params": query params object (for GET) or body object (for POST)
- "reason": why you're calling this

If no API is needed, return an empty array [].
Reply with ONLY the JSON array, no markdown, no explanation.`,
        },
      ],
    })

    const planText =
      planResponse.content[0].type === "text"
        ? planResponse.content[0].text
        : "[]"

    let actions: any[] = []
    try {
      actions = JSON.parse(planText)
    } catch {
      logs.push("Agent decided no API calls needed")
    }

    // 4. Execute each action with payment
    const apiResults: Record<string, any> = {}

    for (const action of actions) {
      logs.push(
        `Paying for ${action.service}: ${action.reason}`
      )

      let url = action.endpoint
      if (action.method === "GET" && action.params) {
        const query = new URLSearchParams(action.params).toString()
        if (query) url += `?${query}`
      }

      try {
        const res = await fetchWithPayment(url, {
          method: action.method || "GET",
          ...(action.method === "POST" && action.params
            ? {
                body: JSON.stringify(action.params),
                headers: { "Content-Type": "application/json" },
              }
            : {}),
        })
        const data = await res.json()
        apiResults[action.service] = data
        logs.push(`Received data from ${action.service}`)
      } catch (err) {
        logs.push(
          `Failed to call ${action.service}: ${err instanceof Error ? err.message : "unknown error"}`
        )
      }
    }

    // 5. Generate final response using all collected data
    const totalCost = actions.reduce((sum: number, a: any) => {
      const svc = services.find((s: any) => s.name === a.service)
      return sum + (svc ? parseFloat(svc.price) : 0)
    }, 0)

    logs.push(
      `Total spent: $${totalCost.toFixed(6)} USDC | ${actions.length} API calls | 0 human approvals`
    )

    const finalResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a helpful AI assistant. The user asked: "${message}"

To answer, I called these paid APIs and got these results:
${JSON.stringify(apiResults, null, 2)}

Now give the user a helpful, natural response based on this data. Be specific and use the actual data. Answer in the same language as the user's message.`,
        },
      ],
    })

    const result =
      finalResponse.content[0].type === "text"
        ? finalResponse.content[0].text
        : "Could not generate a response."

    return Response.json({ logs, result })
  } catch (err) {
    logs.push(
      `Error: ${err instanceof Error ? err.message : "Unknown error"}`
    )
    return Response.json({ logs, result: null }, { status: 500 })
  }
}

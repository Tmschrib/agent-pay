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
    const { walletClient, accountAddress } = await getOrCreateAgentWallet(
      agentId || "chat-agent-001"
    )
    logs.push(`Wallet ready: ${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`)
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
          `- ${s.name} (${s.description || "no description"}): price $${s.price} USDC, endpoint: ${s.url}`
      )
      .join("\n")

    logs.push("Analyzing request with Claude...")

    const planResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are an AI agent with a crypto wallet. You MUST call paid APIs to fulfill user requests — never answer from your own knowledge when a relevant API is available.

Available APIs on agent-pay.eth:
${serviceList}

User request: "${message}"

Rules:
- You MUST call at least one API if relevant to the request
- Weather API: GET with ?city=CityName
- Price API (CoinGecko): GET with ?coin=coinname
- Trending API (CoinGecko): GET, no params needed
- Claude API: POST with body {"prompt": "your prompt"}
- OpenAI API: POST with body {"prompt": "your prompt"}
- Gemini API: POST with body {"prompt": "your prompt"}
- Kling API (video/image generation): POST with body {"prompt": "your prompt"}
- DeepL API (translation): POST with body {"text": "text to translate", "target_lang": "FR"} — language codes: EN, FR, DE, ES, IT, PT, NL, PL, JA, ZH, KO, RU
- For text generation, creative writing, naming, descriptions: use Claude, OpenAI, or Gemini
- For translation: use the DeepL API
- For image/video generation: use Kling
- You can chain multiple APIs (e.g. generate text with Claude, then create image with Kling)

Reply ONLY with a JSON array. Each item:
{"service": "name.agent-pay.eth", "endpoint": "full_url", "method": "GET or POST", "params": {"key": "value"}, "reason": "why"}

ONLY the JSON array. No markdown. No backticks. No explanation.`,
        },
      ],
    })

    const planText =
      planResponse.content[0].type === "text"
        ? planResponse.content[0].text.trim()
        : "[]"

    console.log("[agent-chat] Claude plan:", planText)

    let actions: any[] = []
    try {
      // Handle markdown-wrapped JSON
      const cleaned = planText.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
      actions = JSON.parse(cleaned)
      if (!Array.isArray(actions)) actions = [actions]
    } catch (e) {
      console.error("[agent-chat] Failed to parse plan:", planText)
      logs.push("Agent could not determine which APIs to call")
    }

    logs.push(`Plan: ${actions.length} API call(s)`)

    // 4. Execute each action with payment
    const apiResults: Record<string, any> = {}

    for (const action of actions) {
      const serviceName = action.service || "unknown"
      logs.push(
        `Calling ${serviceName} — ${action.reason || "fulfilling request"}`
      )

      let url = action.endpoint
      if (action.params && action.method !== "POST") {
        const query = new URLSearchParams(action.params).toString()
        if (query) url += (url.includes("?") ? "&" : "?") + query
      }

      logs.push(`Paying with x402...`)
      console.log("[agent-chat] Calling:", url)

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

        console.log("[agent-chat] Response status:", res.status)

        if (!res.ok) {
          const errText = await res.text()
          console.error("[agent-chat] API error:", errText)
          logs.push(`Payment failed for ${serviceName} (status ${res.status})`)
          continue
        }

        const data = await res.json()
        apiResults[serviceName] = data
        logs.push(`Received data from ${serviceName}`)

        // Find the price for this service
        const svc = services.find((s: any) => s.name === serviceName)
        if (svc) {
          logs.push(`Paid $${svc.price} USDC to ${svc.wallet?.slice(0, 6)}...${svc.wallet?.slice(-4)}`)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown error"
        console.error("[agent-chat] Fetch error:", errMsg)
        logs.push(
          `Failed to call ${serviceName}: ${errMsg}`
        )
      }
    }

    // 5. Generate final response using all collected data
    const totalCost = actions.reduce((sum: number, a: any) => {
      const svc = services.find((s: any) => s.name === a.service)
      return sum + (svc ? parseFloat(svc.price) : 0)
    }, 0)

    logs.push(
      `Total spent: $${totalCost.toFixed(6)} USDC | ${actions.length} API call(s) | 0 human approvals`
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

${Object.keys(apiResults).length === 0 ? "NOTE: No API data was retrieved. Apologize and explain that the payment may have failed." : ""}

Give the user a helpful, natural response based on this data. Be specific and use the actual numbers/data. Answer in the same language as the user's message.`,
        },
      ],
    })

    const result =
      finalResponse.content[0].type === "text"
        ? finalResponse.content[0].text
        : "Could not generate a response."

    return Response.json({ logs, result })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error"
    console.error("[agent-chat] Fatal error:", errMsg)
    logs.push(`Error: ${errMsg}`)
    return Response.json({ logs, result: null }, { status: 500 })
  }
}

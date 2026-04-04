import { withX402Logged } from "@/lib/x402"
import { NextRequest, NextResponse } from "next/server"

export const POST = withX402Logged(
  async (req: NextRequest) => {
    const { text, target_lang, source_lang } = await req.json()

    const params = new URLSearchParams({
      text: text || "",
      target_lang: target_lang || "EN",
    })
    if (source_lang) params.append("source_lang", source_lang)

    const response = await fetch(
      "https://api-free.deepl.com/v2/translate",
      {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    )
    const data = await response.json()

    const translation = data.translations?.[0]

    return NextResponse.json({
      translated_text: translation?.text || "",
      detected_source_lang: translation?.detected_source_language || source_lang,
      target_lang: target_lang || "EN",
      source: "deepl.agent-pay.eth",
      cost_paid: "0.000100 USDC",
    })
  },
  process.env.LEDGER_WALLET_ADDRESS as `0x${string}`,
  {
    price: "$0.000100",
    network: "base-sepolia",
  },
  "deepl"
)

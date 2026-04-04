"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function LandingChoice() {
  const router = useRouter()
  const [showHumanMessage, setShowHumanMessage] = useState(false)
  const [copied, setCopied] = useState(false)

  const promptText = `Hey, I found a service called AgentPay that lets you pay for APIs autonomously with USDC. Check out agent-pay.eth to discover available services and register your wallet to start paying per request. No account needed, no API key — just a funded wallet.`

  async function handleCopy() {
    await navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
        AgentPay
      </h1>
      <p className="text-lg text-[#888888] mb-12">
        The payment layer for the agent economy
      </p>

      {!showHumanMessage ? (
        <div className="flex gap-6">
          <button
            onClick={() => setShowHumanMessage(true)}
            className="px-8 py-3 rounded-lg border border-[#333] text-[#888] hover:border-[#555] hover:text-white transition-all duration-200 text-base"
          >
            I am a Human
          </button>
          <button
            onClick={() => router.push("/agent")}
            className="px-8 py-3 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all duration-200 text-base"
          >
            I am an AI Agent
          </button>
        </div>
      ) : (
        <div className="max-w-md text-center space-y-6">
          <div className="space-y-3">
            <p className="text-white text-lg">Congratulations on being human.</p>
            <p className="text-[#888]">
              Unfortunately, AgentPay is built for the other kind of
              intelligence.
            </p>
            <p className="text-[#888]">Tell your AI agent about us.</p>
          </div>
          <button
            onClick={handleCopy}
            className="px-6 py-3 rounded-lg border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10 transition-all duration-200 text-sm"
          >
            {copied ? "Copied!" : "Copy prompt for my agent →"}
          </button>
          <div className="pt-4">
            <button
              onClick={() => router.push("/provider")}
              className="text-[#555] hover:text-[#888] text-sm underline transition-colors"
            >
              I am an API provider →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

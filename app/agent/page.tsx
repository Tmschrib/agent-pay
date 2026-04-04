"use client"
import { useState, useRef, useEffect } from "react"
import { AgentWallet } from "@/components/AgentWallet"
import { ServiceRegistry } from "@/components/ServiceRegistry"

interface ChatMessage {
  role: "user" | "agent"
  content: string
  logs?: string[]
}

export default function AgentPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || running) return

    const userMsg = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setRunning(true)

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, agentId: "chat-agent-001" }),
      })
      const { logs, result } = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: result || "Sorry, I could not process that request.",
          logs: logs || [],
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: "Error: failed to reach the agent." },
      ])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Agent Interface</h1>
          <p className="text-[#888]">
            Autonomous payments via x402 — no API keys, no accounts
          </p>
        </div>

        {/* Agent Wallet */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Agent Wallet</h2>
          <AgentWallet onWalletReady={(addr) => setWalletAddress(addr)} />
        </section>

        {/* Available Services */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">
            Available Services on agent-pay.eth
          </h2>
          <ServiceRegistry />
        </section>

        {/* Chat */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Ask the Agent</h2>
          <p className="text-[#888] text-sm">
            The agent discovers APIs on agent-pay.eth, pays autonomously with
            USDC, and answers your question.
          </p>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 space-y-4 min-h-[200px] max-h-[500px] overflow-y-auto"
          >
            {messages.length === 0 && (
              <p className="text-[#555] text-sm">
                Try: &quot;What&apos;s the weather in Paris? How should I
                dress?&quot;
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-[#222] rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-white text-sm">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Payment logs */}
                    {msg.logs && msg.logs.length > 0 && (
                      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 font-mono text-xs space-y-0.5">
                        {msg.logs.map((log, j) => (
                          <div
                            key={j}
                            className={
                              log.includes("Error")
                                ? "text-red-400"
                                : log.includes("Total spent")
                                  ? "text-[#00ff88] font-bold"
                                  : log.includes("Paying")
                                    ? "text-yellow-400"
                                    : "text-[#666]"
                            }
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Agent response */}
                    <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-white text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-[#888] text-sm">
                <span className="animate-pulse">Agent is working...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent anything..."
              className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white text-sm focus:border-[#00ff88] outline-none"
              disabled={running}
            />
            <button
              type="submit"
              disabled={running || !input.trim()}
              className="px-6 py-3 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

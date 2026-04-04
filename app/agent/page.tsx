"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ServiceRegistry } from "@/components/ServiceRegistry"

interface ChatMessage {
  role: "user" | "agent"
  content: string
  logs?: string[]
}

export default function AgentPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchBalance = useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`/api/balance?wallet=${wallet}`)
      const data = await res.json()
      setBalance(data.balance)
    } catch {
      // Keep current balance on error
    }
  }, [])

  useEffect(() => {
    const id = localStorage.getItem("agentId")
    const wallet = localStorage.getItem("agentWallet")
    if (!id || !wallet) {
      router.push("/agent/login")
      return
    }
    setAgentId(id)
    setWalletAddress(wallet)
    fetchBalance(wallet)
    const interval = setInterval(() => fetchBalance(wallet), 10000)
    return () => clearInterval(interval)
  }, [router, fetchBalance])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  function handleLogout() {
    localStorage.removeItem("agentId")
    localStorage.removeItem("agentWallet")
    router.push("/agent/login")
  }

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
        body: JSON.stringify({ message: userMsg, agentId: agentId || "default" }),
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

  if (!agentId || !walletAddress) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Agent Interface</h1>
            <p className="text-[#888]">
              Autonomous payments via x402 — no API keys, no accounts
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            Disconnect
          </button>
        </div>

        {/* Agent Wallet */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[#888] text-xs uppercase tracking-wider">
                Agent: {agentId}
              </div>
              <div className="text-white font-mono text-sm">{walletAddress}</div>
              <div className="text-[#00ff88] text-xs">Base Sepolia — USDC</div>
            </div>
            <div className="text-right">
              <div className="text-[#888] text-xs uppercase tracking-wider mb-1">
                Balance
              </div>
              <div className="text-2xl font-bold text-[#00ff88]">
                {balance !== null ? `${balance}` : "—"}
              </div>
              <div className="text-[#888] text-xs">USDC</div>
            </div>
          </div>
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

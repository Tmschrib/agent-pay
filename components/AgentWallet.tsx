"use client"
import { useState } from "react"

interface AgentWalletProps {
  onWalletReady: (address: string, agentId: string) => void
}

export function AgentWallet({ onWalletReady }: AgentWalletProps) {
  const [agentId, setAgentId] = useState("")
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setAddress(data.address)
      setIsNew(data.isNew)
      onWalletReady(data.address, agentId.trim().toLowerCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  if (address) {
    return (
      <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 space-y-1">
        <div className="text-[#888] text-xs uppercase tracking-wider">
          Agent: {agentId}
          {isNew ? (
            <span className="text-[#00ff88] ml-2">new account</span>
          ) : (
            <span className="text-yellow-400 ml-2">existing account</span>
          )}
        </div>
        <div className="text-white font-mono text-sm">{address}</div>
        <div className="text-[#00ff88] text-xs">Base Sepolia — USDC</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleConnect} className="space-y-3">
      <div>
        <label className="text-[#888] text-sm block mb-1">
          Enter your Agent ID
        </label>
        <div className="flex gap-3">
          <input
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="e.g. agentpay"
            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white text-sm focus:border-[#00ff88] outline-none"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !agentId.trim()}
            className="px-6 py-3 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all disabled:opacity-50 text-sm"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
        <p className="text-[#555] text-xs mt-1">
          Same ID = same wallet. New ID = new account.
        </p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}

"use client"
import { useState } from "react"

interface AgentWalletProps {
  onWalletReady: (address: string) => void
}

export function AgentWallet({ onWalletReady }: AgentWalletProps) {
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createWallet() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "style-agent-001" }),
      })
      const data = await res.json()
      setAddress(data.address)
      onWalletReady(data.address)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {!address ? (
        <button
          onClick={createWallet}
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all disabled:opacity-50"
        >
          {loading ? "Creating wallet..." : "Initialize Agent Wallet"}
        </button>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-lg p-4 space-y-1">
          <div className="text-[#888] text-xs uppercase tracking-wider">
            Agent Wallet (Dynamic)
          </div>
          <div className="text-white font-mono text-sm">{address}</div>
          <div className="text-[#00ff88] text-xs">Base Sepolia - USDC</div>
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}

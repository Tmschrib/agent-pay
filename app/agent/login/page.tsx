"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AgentLoginPage() {
  const router = useRouter()
  const [agentId, setAgentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId.trim()) return
    setLoading(true)
    setError(null)
    try {
      // First check if account exists without creating
      const checkRes = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId.trim().toLowerCase(), checkOnly: true }),
      })
      const checkData = await checkRes.json()
      if (checkData.isNew) {
        setError("No account found with this ID")
        return
      }
      // Account exists, load it
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
      localStorage.setItem("agentId", agentId.trim().toLowerCase())
      localStorage.setItem("agentWallet", data.address)
      router.push("/agent")
    } catch {
      setError("Connection failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleNewWallet() {
    setLoading(true)
    setError(null)
    try {
      const newId = `agent-${Date.now().toString(36)}`
      const res = await fetch("/api/agent-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: newId }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      localStorage.setItem("agentId", newId)
      localStorage.setItem("agentWallet", data.address)
      router.push("/agent")
    } catch {
      setError("Failed to create wallet")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="w-full max-w-md px-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Agent Login</h1>
          <p className="text-[#888]">
            Connect to your agent wallet or create a new one
          </p>
        </div>

        {/* Login with existing ID */}
        <form
          onSubmit={handleLogin}
          className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">Existing Agent</h2>
          <div>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="Enter your agent ID"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white text-sm focus:border-[#00ff88] outline-none"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !agentId.trim()}
            className="w-full px-6 py-3 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#222]" />
          <span className="text-[#555] text-sm">or</span>
          <div className="flex-1 h-px bg-[#222]" />
        </div>

        {/* Create new wallet */}
        <button
          onClick={handleNewWallet}
          disabled={loading}
          className="w-full px-6 py-3 rounded-lg border border-[#333] text-white font-semibold hover:border-[#00ff88] hover:text-[#00ff88] transition-all text-sm disabled:opacity-50"
        >
          {loading ? "Creating..." : "Initialize New Wallet"}
        </button>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  )
}

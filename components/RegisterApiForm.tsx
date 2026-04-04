"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LedgerConnect } from "./LedgerConnect"

export function RegisterApiForm() {
  const router = useRouter()
  const [providerAddress, setProviderAddress] = useState<string | null>(null)
  const [regName, setRegName] = useState("")
  const [regDesc, setRegDesc] = useState("")
  const [regEndpoint, setRegEndpoint] = useState("")
  const [regPrice, setRegPrice] = useState("")
  const [regTwitter, setRegTwitter] = useState("")
  const [regGithub, setRegGithub] = useState("")
  const [regStatus, setRegStatus] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!providerAddress) return
    setRegistering(true)
    setRegStatus("Registering on ENS...")
    try {
      const res = await fetch("/api/register-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: regName,
          endpoint: regEndpoint,
          price: regPrice,
          walletAddress: providerAddress,
          description: regDesc,
          twitter: regTwitter || undefined,
          github: regGithub || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRegStatus(`Registered: ${data.ensName}`)
        setTimeout(() => router.push("/provider"), 1500)
      } else {
        setRegStatus(`Failed: ${data.error}`)
      }
    } catch {
      setRegStatus("Registration failed")
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Register a new API</h1>
            <p className="text-[#888]">
              Create an ENS subname and start receiving payments
            </p>
          </div>
          <Link
            href="/provider"
            className="px-5 py-2.5 rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Ledger Connection */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">1. Connect Ledger</h2>
          <LedgerConnect
            onAddressReceived={(addr) => {
              setProviderAddress(addr)
            }}
          />
        </section>

        {providerAddress && (
          <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">2. Service Details</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    Service name
                  </label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="weather"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                    required
                  />
                  <span className="text-[#555] text-xs mt-1 block">
                    {regName || "name"}.agent-pay.eth
                  </span>
                </div>
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    Price per request (USDC)
                  </label>
                  <input
                    value={regPrice}
                    onChange={(e) => setRegPrice(e.target.value)}
                    placeholder="0.000500"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[#888] text-sm block mb-1">
                  Description
                </label>
                <input
                  value={regDesc}
                  onChange={(e) => setRegDesc(e.target.value)}
                  placeholder="Real-time weather data"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[#888] text-sm block mb-1">
                  Endpoint URL
                </label>
                <input
                  value={regEndpoint}
                  onChange={(e) => setRegEndpoint(e.target.value)}
                  placeholder="https://mysite.com/api/weather"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    Twitter <span className="text-[#555]">(optional)</span>
                  </label>
                  <input
                    value={regTwitter}
                    onChange={(e) => setRegTwitter(e.target.value)}
                    placeholder="@handle"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    GitHub <span className="text-[#555]">(optional)</span>
                  </label>
                  <input
                    value={regGithub}
                    onChange={(e) => setRegGithub(e.target.value)}
                    placeholder="user/repo"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={registering}
                className="px-6 py-2 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm disabled:opacity-50"
              >
                {registering ? "Registering..." : "Register on ENS"}
              </button>
              {regStatus && (
                <p className="text-[#888] text-sm">{regStatus}</p>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  )
}

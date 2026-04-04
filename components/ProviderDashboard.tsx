"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { LedgerConnect } from "./LedgerConnect"
import { withdrawFunds } from "@/lib/ledger"

interface ProviderStats {
  totalRequests: number
  totalRevenue: string
  lastTransaction: string | null
  services: { name: string; requests: number; revenue: string }[]
}

interface MyService {
  name: string
  url: string | null
  price: string | null
  description: string | null
}

export function ProviderDashboard() {
  const [providerAddress, setProviderAddress] = useState<string | null>(null)
  const [ledgerSession, setLedgerSession] = useState<{
    dmk: any
    sessionId: string
  } | null>(null)
  const [withdrawTo, setWithdrawTo] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawTx, setWithdrawTx] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)

  const [myServices, setMyServices] = useState<MyService[]>([])

  const fetchMyServices = useCallback(async (wallet: string) => {
    try {
      const res = await fetch("/api/get-services")
      const data = await res.json()
      const mine = (data.services || []).filter(
        (s: any) => s.wallet?.toLowerCase() === wallet.toLowerCase()
      )
      setMyServices(mine)
    } catch {
      // Keep current list on error
    }
  }, [])

  const [stats, setStats] = useState<ProviderStats>({
    totalRequests: 0,
    totalRevenue: "$0.000000",
    lastTransaction: null,
    services: [],
  })

  const fetchStats = useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`/api/provider-stats?wallet=${wallet}`)
      const data = await res.json()
      setStats(data)
    } catch {
      // Keep current stats on error
    }
  }, [])

  useEffect(() => {
    if (!providerAddress) return
    fetchStats(providerAddress)
    fetchMyServices(providerAddress)
    const interval = setInterval(() => {
      fetchStats(providerAddress)
      fetchMyServices(providerAddress)
    }, 10000)
    return () => clearInterval(interval)
  }, [providerAddress, fetchStats, fetchMyServices])

  async function handleWithdraw() {
    if (!ledgerSession || !withdrawTo || !withdrawAmount) return
    setWithdrawing(true)
    try {
      const txHash = await withdrawFunds(
        ledgerSession.dmk,
        ledgerSession.sessionId,
        withdrawTo as `0x${string}`,
        withdrawAmount
      )
      setWithdrawTx(txHash)
    } catch (err) {
      console.error("Withdraw failed:", err)
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
            <p className="text-[#888]">
              Connect your Ledger, manage APIs, and track revenue
            </p>
          </div>
          <Link
            href="/provider/new-api"
            className="px-5 py-2.5 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm"
          >
            Register API
          </Link>
        </div>

        {/* Step 1: Ledger Connection */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">1. Connect Ledger</h2>
          <LedgerConnect
            onAddressReceived={(addr, dmk, sessionId) => {
              setProviderAddress(addr)
              setLedgerSession({ dmk, sessionId })
            }}
          />
        </section>

        {providerAddress && (
          <>
            {/* My APIs */}
            <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">2. My APIs</h2>
              {myServices.length === 0 ? (
                <p className="text-[#555] text-sm">
                  No APIs registered yet —{" "}
                  <Link
                    href="/provider/new-api"
                    className="text-[#00ff88] underline"
                  >
                    register one
                  </Link>
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myServices.map((s) => (
                    <div
                      key={s.name}
                      className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#00ff88] font-mono text-sm">
                          {s.name}
                        </span>
                        <span className="text-white font-mono text-sm">
                          ${s.price} USDC
                        </span>
                      </div>
                      <p className="text-[#888] text-sm">{s.description}</p>
                      <div className="text-[#555] text-xs font-mono truncate">
                        {s.url}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Revenue Dashboard */}
            <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-6">
              <h2 className="text-xl font-semibold">3. Revenue Dashboard</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
                  <div className="text-[#888] text-xs uppercase tracking-wider mb-1">
                    Total Requests
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.totalRequests}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
                  <div className="text-[#888] text-xs uppercase tracking-wider mb-1">
                    Revenue
                  </div>
                  <div className="text-2xl font-bold text-[#00ff88]">
                    {stats.totalRevenue}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
                  <div className="text-[#888] text-xs uppercase tracking-wider mb-1">
                    Last Transaction
                  </div>
                  <div className="text-2xl font-bold">
                    {stats.lastTransaction
                      ? new Date(stats.lastTransaction).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm text-[#888] uppercase tracking-wider">
                  Services
                </h3>
                {stats.services.length === 0 && (
                  <p className="text-[#555] text-sm py-3">
                    No payments received yet
                  </p>
                )}
                {stats.services.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#00ff88]" />
                      <span className="font-mono text-sm">{s.name}</span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <span className="text-[#888]">
                        {s.requests} requests
                      </span>
                      <span className="text-[#00ff88]">{s.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Withdraw */}
            <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">4. Withdraw Funds</h2>
              <p className="text-[#888] text-sm">
                Requires physical confirmation on your Ledger device
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    Destination address
                  </label>
                  <input
                    value={withdrawTo}
                    onChange={(e) => setWithdrawTo(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-sm block mb-1">
                    Amount (USDC)
                  </label>
                  <input
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.05"
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#00ff88] outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !ledgerSession}
                className="px-6 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-all text-sm disabled:opacity-50"
              >
                {withdrawing
                  ? "Confirm on Ledger..."
                  : "Withdraw (requires Ledger)"}
              </button>
              {withdrawTx && (
                <a
                  href={`https://sepolia.basescan.org/tx/${withdrawTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline text-sm block"
                >
                  Withdraw confirmed — View on BaseScan
                </a>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

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

const ADMIN_WALLET = "0x63EDBa757005B5140903Fda3D343507111d0480d"
const ADMIN_PASSWORD = "agentpay"

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
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [adminMode, setAdminMode] = useState(false)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [adminError, setAdminError] = useState(false)

  const fetchBalance = useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`/api/balance?wallet=${wallet}`)
      const data = await res.json()
      setBalance(data.balance)
    } catch {
      // Keep current balance on error
    }
  }, [])

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

  const fetchStats = useCallback(async (wallet: string, isAdmin = false) => {
    try {
      const url = isAdmin
        ? "/api/provider-stats"
        : `/api/provider-stats?wallet=${wallet}`
      const res = await fetch(url)
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
    fetchBalance(providerAddress)
    const interval = setInterval(() => {
      fetchStats(providerAddress)
      fetchMyServices(providerAddress)
      fetchBalance(providerAddress)
    }, 10000)
    return () => clearInterval(interval)
  }, [providerAddress, fetchStats, fetchMyServices, fetchBalance])

  function handleAdminLogin() {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminMode(true)
      setShowAdminPrompt(false)
      setAdminPassword("")
      setAdminError(false)
      setProviderAddress(ADMIN_WALLET)
      fetchBalance(ADMIN_WALLET)
      fetchStats(ADMIN_WALLET, true)
      fetchMyServices(ADMIN_WALLET)
    } else {
      setAdminError(true)
    }
  }

  // Refresh admin stats
  useEffect(() => {
    if (!adminMode) return
    const interval = setInterval(() => {
      fetchStats(ADMIN_WALLET, true)
      fetchMyServices(ADMIN_WALLET)
      fetchBalance(ADMIN_WALLET)
    }, 10000)
    return () => clearInterval(interval)
  }, [adminMode, fetchStats, fetchMyServices, fetchBalance])

  async function handleWithdraw() {
    if (!ledgerSession || !withdrawTo || !withdrawAmount) return
    setWithdrawing(true)
    setWithdrawError(null)
    setWithdrawTx(null)
    try {
      console.log("Starting withdraw...", { to: withdrawTo, amount: withdrawAmount })
      const txHash = await withdrawFunds(
        ledgerSession.dmk,
        ledgerSession.sessionId,
        withdrawTo as `0x${string}`,
        withdrawAmount
      )
      console.log("Withdraw tx:", txHash)
      setWithdrawTx(txHash)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Withdraw failed:", msg, err)
      setWithdrawError(msg)
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
          <div className="flex items-center gap-3">
            {!adminMode && (
              <button
                onClick={() => setShowAdminPrompt(true)}
                className="px-5 py-2.5 rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-all text-sm"
              >
                Admin Mode
              </button>
            )}
            {adminMode && (
              <button
                onClick={() => {
                  setAdminMode(false)
                  setProviderAddress(null)
                  setBalance(null)
                  setStats({ totalRequests: 0, totalRevenue: "$0.000000", lastTransaction: null, services: [] })
                  setMyServices([])
                }}
                className="px-5 py-2.5 rounded-lg border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-all text-sm"
              >
                Exit Admin
              </button>
            )}
            <Link
              href="/provider/new-api"
              className="px-5 py-2.5 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm"
            >
              Register API
            </Link>
          </div>
        </div>

        {/* Admin Password Prompt */}
        {showAdminPrompt && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-semibold">Admin Mode</h2>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminError(false) }}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                placeholder="Enter admin password"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white text-sm focus:border-[#00ff88] outline-none"
                autoFocus
              />
              {adminError && (
                <p className="text-red-400 text-sm">Wrong password</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAdminPrompt(false); setAdminPassword(""); setAdminError(false) }}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#333] text-[#888] hover:text-white transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminLogin}
                  disabled={!adminPassword}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#00ff88] text-black font-semibold hover:bg-[#00dd77] transition-all text-sm disabled:opacity-50"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Ledger Connection or Admin Wallet */}
        <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {adminMode ? "1. Platform Wallet" : "1. Connect Ledger"}
            </h2>
            {providerAddress && balance !== null && (
              <div className="text-right">
                <div className="text-[#888] text-xs uppercase tracking-wider mb-1">
                  Balance
                </div>
                <div className="text-2xl font-bold text-[#00ff88]">
                  {balance}
                </div>
                <div className="text-[#888] text-xs">USDC</div>
              </div>
            )}
          </div>
          {adminMode ? (
            <div className="flex items-center gap-2 text-yellow-400">
              <span>AgentPay Platform</span>
              <span className="font-mono text-sm">
                {ADMIN_WALLET.slice(0, 6)}...{ADMIN_WALLET.slice(-4)}
              </span>
            </div>
          ) : (
            <LedgerConnect
              onAddressReceived={(addr, dmk, sessionId) => {
                setProviderAddress(addr)
                setLedgerSession({ dmk, sessionId })
                fetchBalance(addr)
              }}
            />
          )}
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

            {/* Withdraw (not in admin mode) */}
            {!adminMode && <section className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
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
              {withdrawError && (
                <p className="text-red-400 text-sm">{withdrawError}</p>
              )}
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
            </section>}
          </>
        )}
      </div>
    </div>
  )
}

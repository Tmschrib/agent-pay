"use client"
import { useState } from "react"
import { connectLedger } from "@/lib/ledger"

export function LedgerConnect({
  onAddressReceived,
}: {
  onAddressReceived: (address: string, dmk: any, sessionId: string) => void
}) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle")
  const [address, setAddress] = useState<string>("")

  async function handleConnect() {
    setStatus("connecting")
    try {
      const {
        address: ledgerAddress,
        dmk,
        sessionId,
      } = await connectLedger()
      setAddress(ledgerAddress)
      setStatus("connected")
      onAddressReceived(ledgerAddress, dmk, sessionId)
    } catch (err) {
      console.error(err)
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "idle" && (
        <button
          onClick={handleConnect}
          className="bg-black text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/10 transition"
        >
          Connect Ledger
        </button>
      )}
      {status === "connecting" && (
        <p className="text-gray-400">
          Connecting to Ledger... Unlock your device and open the Ethereum app.
        </p>
      )}
      {status === "connected" && (
        <div className="flex items-center gap-2 text-green-400">
          <span>Connected</span>
          <span>
            Ledger connected: {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
      )}
      {status === "error" && (
        <p className="text-red-400">
          Connection failed. Make sure your Ledger is unlocked and the Ethereum
          app is open.
        </p>
      )}
    </div>
  )
}

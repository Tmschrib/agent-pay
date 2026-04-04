"use client"
import { useState, useEffect } from "react"

interface Service {
  name: string
  url: string | null
  price: string | null
  wallet: string | null
  description: string | null
}

export function ServiceRegistry() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-services")
        const data = await res.json()
        setServices(data.services || [])
      } catch {
        setServices([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="text-[#888] text-sm">
        Loading services from agent-pay.eth...
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-[#888] text-sm">
        No services found on agent-pay.eth
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div
          key={service.name}
          className="bg-[#111] border border-[#222] rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[#00ff88] font-mono text-sm">
              {service.name}
            </span>
            <span className="text-white font-mono text-sm">
              ${service.price} USDC
            </span>
          </div>
          <p className="text-[#888] text-sm">{service.description}</p>
          <div className="text-[#555] text-xs font-mono truncate">
            {service.wallet?.slice(0, 6)}...{service.wallet?.slice(-4)}
          </div>
        </div>
      ))}
    </div>
  )
}

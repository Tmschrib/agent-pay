import { NextRequest, NextResponse } from "next/server"
import { getPayments, getServiceRegistry } from "@/lib/store"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")

  let payments = await getPayments()

  // Filter by wallet if provided
  if (wallet) {
    try {
      const registry = await getServiceRegistry()
      const walletServices = Object.entries(registry.metadata || {})
        .filter(([_, meta]) => meta.wallet?.toLowerCase() === wallet.toLowerCase())
        .map(([name]) => name)

      payments = payments.filter((p) => walletServices.includes(p.service))
    } catch {
      // Can't filter, return all
    }
  }

  // Aggregate stats per service
  const serviceStats: Record<string, { requests: number; revenue: number }> = {}
  for (const p of payments) {
    const priceNum = parseFloat(p.price.replace("$", ""))
    if (!serviceStats[p.service]) {
      serviceStats[p.service] = { requests: 0, revenue: 0 }
    }
    serviceStats[p.service].requests += 1
    serviceStats[p.service].revenue += priceNum
  }

  const totalRequests = payments.length
  const totalRevenue = Object.values(serviceStats).reduce((sum, s) => sum + s.revenue, 0)
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null

  return NextResponse.json({
    totalRequests,
    totalRevenue: `$${totalRevenue.toFixed(6)}`,
    lastTransaction: lastPayment ? lastPayment.timestamp : null,
    services: Object.entries(serviceStats).map(([name, stats]) => ({
      name: `${name}.agent-pay.eth`,
      requests: stats.requests,
      revenue: `$${stats.revenue.toFixed(6)}`,
    })),
  })
}

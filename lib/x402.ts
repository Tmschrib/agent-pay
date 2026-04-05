import { wrapFetchWithPayment } from "x402-fetch"
import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"
import { getServiceRegistry, appendPayment } from "./store"

export const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator"

export async function callServiceWithPayment(
  serviceUrl: string,
  walletClient: any,
  options?: RequestInit
) {
  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)
  const response = await fetchWithPayment(serviceUrl, options)
  return response.json()
}

async function getServicePrice(proxyPath: string, fallbackPrice: string): Promise<string> {
  try {
    const registry = await getServiceRegistry()
    for (const [, meta] of Object.entries(registry.metadata || {})) {
      const metaUrl = meta.url
      if (metaUrl) {
        try {
          const metaPathname = new URL(metaUrl).pathname
          if (proxyPath === metaPathname || proxyPath.startsWith(metaPathname)) {
            return `$${meta.price}`
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  } catch {
    // Can't read registry
  }
  return fallbackPrice
}

async function resolveServiceName(requestUrl: string, fallbackName: string): Promise<string> {
  try {
    const registry = await getServiceRegistry()
    const pathname = new URL(requestUrl).pathname

    for (const [name, meta] of Object.entries(registry.metadata || {})) {
      const metaUrl = meta.url
      if (metaUrl) {
        try {
          const metaPathname = new URL(metaUrl).pathname
          if (pathname === metaPathname || pathname.startsWith(metaPathname)) {
            return name
          }
        } catch {
          // Invalid URL in metadata, skip
        }
      }
    }
  } catch {
    // Can't read registry, use fallback
  }
  return fallbackName
}

export function withX402Logged(
  handler: (req: NextRequest) => Promise<NextResponse>,
  payTo: `0x${string}`,
  fallbackConfig: { price: string; network: "base-sepolia" },
  fallbackServiceName: string
) {
  return async (req: NextRequest) => {
    // Resolve price dynamically from registry
    const pathname = new URL(req.url).pathname
    const dynamicPrice = await getServicePrice(pathname, fallbackConfig.price)
    const config = { ...fallbackConfig, price: dynamicPrice }

    const wrapped = withX402(handler, payTo, config)
    const response = await wrapped(req)

    if (response.status < 400 && response.headers.has("x-payment-response")) {
      const serviceName = await resolveServiceName(req.url, fallbackServiceName)

      try {
        const paymentData = JSON.parse(
          response.headers.get("x-payment-response") || "{}"
        )
        await appendPayment({
          service: serviceName,
          price: config.price,
          payer: paymentData.payer || "unknown",
          transaction: paymentData.transaction || "unknown",
          network: paymentData.network || config.network,
          timestamp: new Date().toISOString(),
        })
      } catch {
        await appendPayment({
          service: serviceName,
          price: config.price,
          payer: "unknown",
          transaction: "unknown",
          network: config.network,
          timestamp: new Date().toISOString(),
        })
      }
    }

    return response
  }
}

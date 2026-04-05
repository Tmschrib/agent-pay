import { wrapFetchWithPayment } from "x402-fetch"
import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator"

const REGISTRY_FILE = path.join(process.cwd(), "lib", "registered-services.json")

export function getServicePrice(proxyPath: string, fallbackPrice: string): string {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"))
    for (const [, meta] of Object.entries(registry.metadata || {})) {
      const metaUrl = (meta as any).url
      if (metaUrl) {
        try {
          const metaPathname = new URL(metaUrl).pathname
          if (proxyPath === metaPathname || proxyPath.startsWith(metaPathname)) {
            return `$${(meta as any).price}`
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

export async function callServiceWithPayment(
  serviceUrl: string,
  walletClient: any,
  options?: RequestInit
) {
  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)
  const response = await fetchWithPayment(serviceUrl, options)
  return response.json()
}

const PAYMENTS_FILE = path.join(process.cwd(), "lib", "payments.json")

function logPayment(entry: {
  service: string
  price: string
  payer: string
  transaction: string
  network: string
  timestamp: string
}) {
  try {
    const data = JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf-8"))
    data.payments.push(entry)
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(data, null, 2) + "\n")
  } catch {
    fs.writeFileSync(
      PAYMENTS_FILE,
      JSON.stringify({ payments: [entry] }, null, 2) + "\n"
    )
  }
}

function resolveServiceName(requestUrl: string, fallbackName: string): string {
  try {
    const registry = JSON.parse(fs.readFileSync(PAYMENTS_FILE.replace("payments.json", "registered-services.json"), "utf-8"))
    const pathname = new URL(requestUrl).pathname

    // Find all services whose URL matches this endpoint
    for (const [name, meta] of Object.entries(registry.metadata || {})) {
      const metaUrl = (meta as any).url
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
  fallbackConfig: { price: string; network: string },
  fallbackServiceName: string
) {
  return async (req: NextRequest) => {
    // Resolve price dynamically from registry
    const pathname = new URL(req.url).pathname
    const dynamicPrice = getServicePrice(pathname, fallbackConfig.price)
    const config = { ...fallbackConfig, price: dynamicPrice }

    const wrapped = withX402(handler, payTo, config)
    const response = await wrapped(req)

    if (response.status < 400 && response.headers.has("x-payment-response")) {
      const serviceName = resolveServiceName(req.url, fallbackServiceName)

      try {
        const paymentData = JSON.parse(
          response.headers.get("x-payment-response") || "{}"
        )
        logPayment({
          service: serviceName,
          price: config.price,
          payer: paymentData.payer || "unknown",
          transaction: paymentData.transaction || "unknown",
          network: paymentData.network || config.network,
          timestamp: new Date().toISOString(),
        })
      } catch {
        logPayment({
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

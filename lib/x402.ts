import { wrapFetchWithPayment } from "x402-fetch"
import { withX402 } from "x402-next"
import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

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

export function withX402Logged(
  handler: (req: NextRequest) => Promise<NextResponse>,
  payTo: `0x${string}`,
  config: { price: string; network: string },
  serviceName: string
) {
  const wrapped = withX402(handler, payTo, config)

  return async (req: NextRequest) => {
    const response = await wrapped(req)

    if (response.status < 400 && response.headers.has("x-payment-response")) {
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
        // Payment succeeded but couldn't parse response header — still log it
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

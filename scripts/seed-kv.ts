import { config } from "dotenv"
config({ path: ".env.local" })

import { Redis } from "@upstash/redis"
import { readFileSync } from "fs"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function main() {
  // Seed services
  const services = JSON.parse(readFileSync("lib/registered-services.json", "utf-8"))
  await redis.set("services", services)
  console.log("Seeded services:", services.services.length, "services")

  // Seed payments
  const payments = JSON.parse(readFileSync("lib/payments.json", "utf-8"))
  await redis.set("payments", payments.payments)
  console.log("Seeded payments:", payments.payments.length, "entries")

  // Seed agents
  const agents = JSON.parse(readFileSync("lib/agents.json", "utf-8"))
  await redis.set("agents", agents)
  console.log("Seeded agents:", Object.keys(agents).length, "agents")

  console.log("Done!")
}

main().catch(console.error)

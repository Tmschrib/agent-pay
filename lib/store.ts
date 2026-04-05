import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// --- Service Registry ---

export interface ServiceMeta {
  url: string
  price: string
  wallet: string
  description: string
  ensName: string
  verified?: boolean
  registeredAt?: string
}

export interface ServiceRegistry {
  services: string[]
  metadata: Record<string, ServiceMeta>
}

export async function getServiceRegistry(): Promise<ServiceRegistry> {
  const data = await redis.get<ServiceRegistry>("services")
  return data || { services: [], metadata: {} }
}

export async function setServiceRegistry(data: ServiceRegistry): Promise<void> {
  await redis.set("services", data)
}

// --- Payments ---

export interface PaymentEntry {
  service: string
  price: string
  payer: string
  transaction: string
  network: string
  timestamp: string
}

export async function getPayments(): Promise<PaymentEntry[]> {
  const data = await redis.get<PaymentEntry[]>("payments")
  return data || []
}

export async function appendPayment(entry: PaymentEntry): Promise<void> {
  const payments = await getPayments()
  payments.push(entry)
  await redis.set("payments", payments)
}

// --- Agents ---

export async function getAgents(): Promise<Record<string, string>> {
  const data = await redis.get<Record<string, string>>("agents")
  return data || {}
}

export async function getAgent(agentId: string): Promise<string | null> {
  const agents = await getAgents()
  return agents[agentId] || null
}

export async function setAgent(agentId: string, address: string): Promise<void> {
  const agents = await getAgents()
  agents[agentId] = address
  await redis.set("agents", agents)
}

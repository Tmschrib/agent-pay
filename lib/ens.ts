import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { normalize } from "viem/ens"
import registeredServices from "./registered-services.json"

const localMetadata: Record<
  string,
  { url: string; price: string; wallet: string; description: string }
> = (registeredServices as any).metadata || {}

export async function getAvailableServices() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  })

  const knownServices: string[] = registeredServices.services

  const services = await Promise.all(
    knownServices.map(async (name) => {
      const fullName = `${name}.agent-pay.eth`

      // Try ENS text records first
      const [url, price, wallet, description] = await Promise.all([
        client.getEnsText({ name: normalize(fullName), key: "url" }).catch(() => null),
        client.getEnsText({ name: normalize(fullName), key: "price" }).catch(() => null),
        client.getEnsText({ name: normalize(fullName), key: "wallet" }).catch(() => null),
        client.getEnsText({ name: normalize(fullName), key: "description" }).catch(() => null),
      ])

      // Fallback to local metadata if ENS records are missing
      const local = localMetadata[name]
      return {
        name: fullName,
        url: url || local?.url || null,
        price: price || local?.price || null,
        wallet: wallet || local?.wallet || null,
        description: description || local?.description || null,
      }
    })
  )

  return services.filter((s) => s.url && s.price && s.wallet)
}

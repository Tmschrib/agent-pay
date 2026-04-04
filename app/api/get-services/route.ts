import { getAvailableServices } from "@/lib/ens"

export async function GET() {
  try {
    const services = await getAvailableServices()
    return Response.json({ services })
  } catch (err) {
    console.error("get-services error:", err)
    return Response.json({ services: [] }, { status: 500 })
  }
}

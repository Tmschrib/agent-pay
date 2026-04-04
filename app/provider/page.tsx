"use client"
import dynamic from "next/dynamic"

const ProviderDashboard = dynamic(
  () =>
    import("@/components/ProviderDashboard").then((m) => m.ProviderDashboard),
  { ssr: false }
)

export default function ProviderPage() {
  return <ProviderDashboard />
}

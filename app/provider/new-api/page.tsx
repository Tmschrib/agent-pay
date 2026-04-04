"use client"
import dynamic from "next/dynamic"

const RegisterApiForm = dynamic(
  () =>
    import("@/components/RegisterApiForm").then((m) => m.RegisterApiForm),
  { ssr: false }
)

export default function NewApiPage() {
  return <RegisterApiForm />
}

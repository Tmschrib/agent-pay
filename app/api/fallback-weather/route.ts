export async function GET() {
  return Response.json({
    city: "Cannes",
    temperature: 24,
    condition: "Sunny",
    humidity: 65,
    source: "weather.agent-pay.eth",
    fallback: true,
    cost_paid: "0.000500 USDC",
  })
}

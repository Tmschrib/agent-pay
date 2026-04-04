# AgentPay

> The payment layer for the agent economy.

## What it does

AgentPay lets any API become payable per-request by AI agents — no account, no API key, no human in the loop.

Built on top of x402, AgentPay adds the missing product layer:
- **ENS** for decentralized service discovery (agent-pay.eth)
- **Dynamic** for autonomous agent wallets
- **Ledger** as the direct cold wallet for API providers

## How it works

1. Provider registers their API on agent-pay.eth with their Ledger address
2. Agent queries ENS to discover available services and prices
3. Agent pays $0.000500 USDC via x402 (weather), $0.000010 USDC (Claude), receives data
4. Payment goes directly to provider's Ledger — no intermediary

## Architecture

```
Agent (Dynamic wallet) --> x402 payment --> API Proxy (x402 middleware) --> Real API
                                              |
                                    ENS (agent-pay.eth) for discovery
                                              |
                                    Ledger (cold wallet) for revenue
```

### Services available on agent-pay.eth

| Service | Price | Source |
|---------|-------|--------|
| weather.agent-pay.eth | $0.000500 | OpenWeatherMap |
| claude.agent-pay.eth | $0.000010 | Anthropic |
| openai.agent-pay.eth | $0.000010 | OpenAI |
| gemini.agent-pay.eth | $0.000010 | Google |
| perplexity.agent-pay.eth | $0.000010 | Perplexity |
| price.agent-pay.eth | $0.000500 | CoinGecko |
| trending.agent-pay.eth | $0.000300 | CoinGecko |
| kling.agent-pay.eth | $0.154000 | Kling AI |

## Tech stack

- Next.js 14 + TypeScript + Tailwind CSS
- ENS on Sepolia (agent-pay.eth)
- Dynamic Node SDK (autonomous server wallets)
- Ledger Device Management Kit
- x402 payment protocol
- USDC on Base Sepolia

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your API keys
npm run dev
```

## Demo scenario: Style Assistant

The agent autonomously:
1. Queries ENS to discover services
2. Pays $0.000500 USDC for weather data in Cannes
3. Pays $0.000010 USDC for Claude outfit suggestions
4. Returns styled outfit recommendations

Total: $0.000510 USDC. Zero API keys. Zero accounts. Zero human approval.

## Tracks

- **ENS**: agent-pay.eth as decentralized service registry for AI agents
- **Dynamic**: server wallets via Node SDK for autonomous agent payments
- **Ledger**: direct cold wallet destination for providers — physical confirmation for withdrawals

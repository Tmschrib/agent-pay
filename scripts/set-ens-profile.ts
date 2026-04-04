import { config } from "dotenv"
config({ path: ".env.local" })
import { createWalletClient, http } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { addEnsContracts } from "@ensdomains/ensjs"
import { setRecords } from "@ensdomains/ensjs/wallet"

const RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD"

async function main() {
  const account = privateKeyToAccount(
    process.env.ENS_OWNER_PRIVATE_KEY as `0x${string}`
  )

  const wallet = createWalletClient({
    account,
    chain: addEnsContracts(sepolia),
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  })

  console.log("Setting ENS profile for agent-pay.eth...")
  console.log("Signer:", account.address)

  const hash = await setRecords(wallet, {
    name: "agent-pay.eth",
    resolverAddress: RESOLVER_ADDRESS,
    texts: [
      { key: "description", value: "Payment layer for the agent economy" },
      { key: "url", value: "https://agent-pay.eth" },
      { key: "com.twitter", value: "agentpayeth" },
      { key: "com.github", value: "Tmschrib/agent-pay" },
      {
        key: "avatar",
        value: "https://i.imgur.com/placeholder-agentpay.png",
      },
    ],
  })

  console.log("Transaction hash:", hash)
  console.log("Waiting for confirmation...")
  console.log("Done! Profile set for agent-pay.eth")
}

main().catch(console.error)

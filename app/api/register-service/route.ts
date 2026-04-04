import { NextRequest } from "next/server"
import { createWalletClient, http } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { addEnsContracts } from "@ensdomains/ensjs"
import { createSubname, setRecords, transferName } from "@ensdomains/ensjs/wallet"

const RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD"

export async function POST(req: NextRequest) {
  const { serviceName, endpoint, price, walletAddress, description } =
    await req.json()

  const account = privateKeyToAccount(
    process.env.ENS_OWNER_PRIVATE_KEY as `0x${string}`
  )

  const walletClient = createWalletClient({
    account,
    chain: addEnsContracts(sepolia),
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  })

  try {
    const fullName = `${serviceName}.agent-pay.eth`

    console.log("Creating subname:", {
      fullName,
      walletAddress,
      signerAddress: account.address,
    })

    // Step 1: Create subname with US as owner (so we can set records)
    await createSubname(walletClient, {
      name: fullName,
      contract: "registry",
      owner: account.address,
      resolverAddress: RESOLVER_ADDRESS,
    })
    console.log("Subname created:", fullName)

    // Step 2: Set text records on-chain
    try {
      const recordsHash = await setRecords(walletClient, {
        name: fullName,
        resolverAddress: RESOLVER_ADDRESS,
        texts: [
          { key: "url", value: endpoint },
          { key: "price", value: price.toString() },
          { key: "wallet", value: walletAddress },
          { key: "description", value: description },
        ],
      })
      console.log("ENS text records set:", recordsHash)
    } catch (recordsErr) {
      console.error("Failed to set ENS text records (continuing):", recordsErr)
    }

    // Step 3: Transfer subname ownership to provider
    try {
      await transferName(walletClient, {
        name: fullName,
        newOwnerAddress: walletAddress as `0x${string}`,
        contract: "registry",
      })
      console.log("Subname transferred to:", walletAddress)
    } catch (transferErr) {
      console.error("Failed to transfer subname (continuing):", transferErr)
    }

    // Step 4: Also store metadata locally (fallback)
    const { readFileSync, writeFileSync } = await import("fs")
    const { join } = await import("path")
    const jsonPath = join(process.cwd(), "lib", "registered-services.json")
    const current = JSON.parse(readFileSync(jsonPath, "utf-8"))

    if (!current.services.includes(serviceName)) {
      current.services.push(serviceName)
    }

    if (!current.metadata) current.metadata = {}
    current.metadata[serviceName] = {
      url: endpoint,
      price: price.toString(),
      wallet: walletAddress,
      description,
      ensName: fullName,
      registeredAt: new Date().toISOString(),
    }

    writeFileSync(jsonPath, JSON.stringify(current, null, 2))
    console.log("Service registered:", fullName)

    return Response.json({
      success: true,
      ensName: fullName,
    })
  } catch (err) {
    console.error("ENS registration error:", err)
    return Response.json(
      { success: false, error: "ENS registration failed" },
      { status: 500 }
    )
  }
}

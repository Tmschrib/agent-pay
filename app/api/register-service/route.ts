import { NextRequest } from "next/server"
import { createWalletClient, createPublicClient, http, namehash } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { addEnsContracts } from "@ensdomains/ensjs"
import { createSubname, setRecords } from "@ensdomains/ensjs/wallet"
import { getServiceRegistry, setServiceRegistry } from "@/lib/store"

const RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD"

export async function POST(req: NextRequest) {
  const { serviceName, endpoint, price, walletAddress, description, twitter, github, avatar } =
    await req.json()

  const account = privateKeyToAccount(
    process.env.ENS_OWNER_PRIVATE_KEY as `0x${string}`
  )

  const chain = addEnsContracts(sepolia)

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  })

  try {
    const fullName = `${serviceName.toLowerCase()}.agent-pay.eth`

    console.log("Creating subname:", {
      fullName,
      walletAddress,
      signerAddress: account.address,
    })

    // Step 1: Create subname (try nameWrapper first, then registry)
    let subnameCreated = false
    for (const contract of ["nameWrapper", "registry"] as const) {
      try {
        await createSubname(walletClient, {
          name: fullName,
          contract,
          owner: account.address,
          resolverAddress: RESOLVER_ADDRESS,
        })
        console.log(`Subname created (${contract}):`, fullName)
        subnameCreated = true
        break
      } catch (err) {
        console.log(`createSubname via ${contract} failed:`, err instanceof Error ? err.message : "unknown")
      }
    }
    if (!subnameCreated) {
      console.log("Subname may already exist, continuing:", fullName)
    }

    // Step 2: Set text records via ensjs
    const texts: { key: string; value: string }[] = [
      { key: "url", value: endpoint },
      { key: "price", value: price.toString() },
      { key: "wallet", value: walletAddress },
      { key: "description", value: description },
      { key: "name", value: `${serviceName} — agent-pay.eth` },
    ]
    if (avatar) texts.push({ key: "avatar", value: avatar })
    if (twitter) texts.push({ key: "com.twitter", value: twitter })
    if (github) texts.push({ key: "com.github", value: github })

    try {
      await setRecords(walletClient, {
        name: fullName,
        resolverAddress: RESOLVER_ADDRESS,
        texts,
      })
      console.log(`ENS records set for ${fullName}:`, texts.map(t => t.key).join(", "))
    } catch (err) {
      console.error(`Failed to set records:`, err instanceof Error ? err.message : err)
    }

    // Step 3: Transfer subname to provider
    try {
      const registryAddress = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
      const registryAbi = [
        {
          name: "setOwner",
          type: "function",
          inputs: [
            { name: "node", type: "bytes32" },
            { name: "owner", type: "address" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const

      const node = namehash(fullName)
      const publicClient = createPublicClient({
        chain,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
      })

      const txHash = await walletClient.writeContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: "setOwner",
        args: [node, walletAddress as `0x${string}`],
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log("Subname transferred to:", walletAddress)
    } catch (transferErr) {
      console.error("Failed to transfer subname (continuing):", transferErr instanceof Error ? transferErr.message : transferErr)
    }

    // Step 4: Store metadata in DB
    const current = await getServiceRegistry()
    const nameKey = serviceName.toLowerCase()
    if (!current.services.includes(nameKey)) {
      current.services.push(nameKey)
    }

    if (!current.metadata) current.metadata = {}
    current.metadata[nameKey] = {
      url: endpoint,
      price: price.toString(),
      wallet: walletAddress,
      description,
      ensName: fullName,
      registeredAt: new Date().toISOString(),
    }

    await setServiceRegistry(current)
    console.log("Service registered:", fullName)

    // Step 5: Update services list on agent-pay.eth profile (on-chain)
    try {
      const serviceList = Object.entries(current.metadata || {}).map(
        ([name, meta]) => ({
          name: name + ".agent-pay.eth",
          url: meta.url,
          price: meta.price,
          description: meta.description,
        })
      )

      await setRecords(walletClient, {
        name: "agent-pay.eth",
        resolverAddress: RESOLVER_ADDRESS,
        texts: [
          { key: "services", value: JSON.stringify(serviceList) },
          { key: "service_count", value: serviceList.length.toString() },
        ],
      })
      console.log("Updated agent-pay.eth profile: " + serviceList.length + " services")
    } catch (profileErr) {
      console.error("Failed to update profile (continuing):", profileErr instanceof Error ? profileErr.message : profileErr)
    }

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

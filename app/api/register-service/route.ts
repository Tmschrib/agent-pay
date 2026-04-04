import { NextRequest } from "next/server"
import { createWalletClient, createPublicClient, http, namehash, encodeFunctionData } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { addEnsContracts } from "@ensdomains/ensjs"
import { createSubname, setRecords } from "@ensdomains/ensjs/wallet"

const RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD"

const resolverAbi = [
  {
    name: "setText",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const

export async function POST(req: NextRequest) {
  const { serviceName, endpoint, price, walletAddress, description, twitter, github } =
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

  const publicClient = createPublicClient({
    chain,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  })

  try {
    const fullName = `${serviceName.toLowerCase()}.agent-pay.eth`
    const node = namehash(fullName)

    console.log("Creating subname:", {
      fullName,
      walletAddress,
      signerAddress: account.address,
    })

    // Step 1: Create subname with us as owner (skip if already exists)
    try {
      await createSubname(walletClient, {
        name: fullName,
        contract: "registry",
        owner: account.address,
        resolverAddress: RESOLVER_ADDRESS,
      })
      console.log("Subname created:", fullName)
    } catch (createErr) {
      console.log("Subname already exists, updating records:", fullName)
    }

    // Step 2: Set text records directly on resolver contract
    const textRecords: { key: string; value: string }[] = [
      { key: "url", value: endpoint },
      { key: "price", value: price.toString() },
      { key: "wallet", value: walletAddress },
      { key: "description", value: description },
    ]
    if (twitter) textRecords.push({ key: "com.twitter", value: twitter })
    if (github) textRecords.push({ key: "com.github", value: github })

    for (const record of textRecords) {
      try {
        const hash = await walletClient.writeContract({
          address: RESOLVER_ADDRESS,
          abi: resolverAbi,
          functionName: "setText",
          args: [node, record.key, record.value],
        })
        await publicClient.waitForTransactionReceipt({ hash })
        console.log(`ENS record set: ${record.key} = ${record.value}`)
      } catch (err) {
        console.error(`Failed to set record ${record.key}:`, err instanceof Error ? err.message : err)
      }
    }

    // Step 3: Transfer subname to provider
    try {
      // Transfer via registry directly
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

    // Step 4: Store metadata locally (fallback)
    const { readFileSync, writeFileSync } = await import("fs")
    const { join } = await import("path")
    const jsonPath = join(process.cwd(), "lib", "registered-services.json")
    const current = JSON.parse(readFileSync(jsonPath, "utf-8"))

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

    writeFileSync(jsonPath, JSON.stringify(current, null, 2))
    console.log("Service registered:", fullName)

    // Step 5: Update services list on agent-pay.eth profile (on-chain)
    try {
      const serviceList = Object.entries(current.metadata || {}).map(
        ([name, meta]: [string, any]) => ({
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

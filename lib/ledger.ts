import { DeviceManagementKitBuilder } from "@ledgerhq/device-management-kit"
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid"
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum"

function buildDmk() {
  return new DeviceManagementKitBuilder()
    .addTransport(webHidTransportFactory)
    .build()
}

export async function connectLedger(): Promise<{
  address: string
  dmk: any
  sessionId: string
}> {
  return new Promise((resolve, reject) => {
    const dmk = buildDmk()

    const subscription = dmk.startDiscovering({}).subscribe({
      next: async (device: any) => {
        subscription.unsubscribe()
        try {
          const sessionId = await dmk.connect({ device })
          const signerEth = new SignerEthBuilder({ dmk, sessionId }).build()

          const { observable } = signerEth.getAddress("44'/60'/0'/0/0", {
            checkOnDevice: false,
          })

          observable.subscribe({
            next: (state: any) => {
              if (state.status === "completed" && state.output?.address) {
                resolve({ address: state.output.address, dmk, sessionId })
              }
            },
            error: reject,
          })
        } catch (err) {
          reject(err)
        }
      },
      error: reject,
    })
  })
}

export async function withdrawFunds(
  dmk: any,
  sessionId: string,
  toAddress: `0x${string}`,
  amountUSDC: string
): Promise<string> {
  const {
    parseUnits,
    encodeFunctionData,
    createPublicClient,
    http,
    serializeTransaction,
    hexToBytes,
    toHex,
  } = await import("viem")
  const { baseSepolia } = await import("viem/chains")
  const { SignerEthBuilder } = await import(
    "@ledgerhq/device-signer-kit-ethereum"
  )

  const erc20ABI = [
    {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
  ] as const

  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`
  const usdcAmount = parseUnits(amountUSDC, 6)

  console.log("[ledger] Building transaction:", {
    to: usdcAddress,
    recipient: toAddress,
    amount: amountUSDC,
  })

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  })

  const signerEth = new SignerEthBuilder({ dmk, sessionId }).build()

  // Get the sender address
  const address = await new Promise<string>((resolve, reject) => {
    const { observable } = signerEth.getAddress("44'/60'/0'/0/0", {
      checkOnDevice: false,
    })
    observable.subscribe({
      next: (state: any) => {
        if (state.status === "completed" && state.output?.address) {
          resolve(state.output.address)
        }
      },
      error: reject,
    })
  })

  console.log("[ledger] Sender address:", address)

  const nonce = await publicClient.getTransactionCount({
    address: address as `0x${string}`,
  })

  const data = encodeFunctionData({
    abi: erc20ABI,
    functionName: "transfer",
    args: [toAddress, usdcAmount],
  })

  const gasEstimate = await publicClient.estimateGas({
    account: address as `0x${string}`,
    to: usdcAddress,
    data,
  })

  const gasPrice = await publicClient.getGasPrice()

  const txParams = {
    to: usdcAddress,
    data,
    chainId: 84532,
    nonce,
    gas: gasEstimate,
    maxFeePerGas: gasPrice * 2n,
    maxPriorityFeePerGas: gasPrice / 10n,
    type: "eip1559" as const,
  }

  // Serialize unsigned transaction to RLP-encoded Uint8Array for Ledger
  const serialized = serializeTransaction(txParams)
  const txBytes = hexToBytes(serialized)

  console.log("[ledger] Sending to Ledger for signature...", {
    nonce,
    gasLimit: gasEstimate.toString(),
  })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          "Ledger signature timeout — make sure the Ethereum app is open on your device"
        )
      )
    }, 60000)

    const { observable } = signerEth.signTransaction(
      "44'/60'/0'/0/0",
      txBytes
    )

    observable.subscribe({
      next: async (state: any) => {
        console.log("[ledger] Sign state:", state.status)
        if (state.status === "completed" && state.output) {
          clearTimeout(timeout)
          try {
            const sig = state.output as { r: string; s: string; v: number }
            console.log("[ledger] Signature received:", { r: sig.r, s: sig.s, v: sig.v })

            // Re-serialize the transaction with the signature
            const signedTx = serializeTransaction(txParams, {
              r: sig.r as `0x${string}`,
              s: sig.s as `0x${string}`,
              v: BigInt(sig.v),
            })

            const txHash = await publicClient.sendRawTransaction({
              serializedTransaction: signedTx,
            })
            console.log("[ledger] TX broadcast:", txHash)
            resolve(txHash)
          } catch (err) {
            reject(err)
          }
        } else if (state.status === "error") {
          clearTimeout(timeout)
          reject(new Error(state.error?.message || "Ledger signing failed"))
        }
      },
      error: (err: any) => {
        clearTimeout(timeout)
        reject(err)
      },
    })
  })
}

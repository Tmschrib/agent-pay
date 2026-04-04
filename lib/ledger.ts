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
  const { parseUnits, encodeFunctionData, createPublicClient, http } =
    await import("viem")
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

  const usdcAmount = parseUnits(amountUSDC, 6)
  const signerEth = new SignerEthBuilder({ dmk, sessionId }).build()

  const transaction = {
    to: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: "transfer",
      args: [toAddress, usdcAmount],
    }),
    chainId: 84532,
  }

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { observable } = signerEth.signTransaction(
      "44'/60'/0'/0/0",
      transaction as any
    )

    observable.subscribe({
      next: async (state: any) => {
        if (state.status === "completed" && state.output) {
          const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(),
          })
          const txHash = await publicClient.sendRawTransaction({
            serializedTransaction: state.output as `0x${string}`,
          })
          resolve(txHash)
        }
      },
      error: reject,
    })
  })
}

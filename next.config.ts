import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@dynamic-labs-wallet/node",
    "@dynamic-labs-wallet/node-evm",
    "@evervault/wasm-attestation-bindings",
    "@ledgerhq/device-management-kit",
    "@ledgerhq/device-signer-kit-ethereum",
    "@ledgerhq/device-transport-kit-web-hid",
  ],
};

export default nextConfig;

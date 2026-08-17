#!/usr/bin/env bash
# Verify all AttestPay testnet contracts on scan.bohr.life (Blockscout) via
# forge, after configuring the chain in foundry.toml [etherscan] section.
set -euo pipefail
cd "$(dirname "$0")/../contracts"

RPC=https://rpc.bohr.life
# Pool, AssetToken, PolicyRegistry, AttestationRegistry
ADDRS=(0xd58afbba54c15ef2828f826e480ae63730967937 0xdf56a8E4C04142aD4768435C321F2D80AD4736d4 0xEF3e2D055aa65F768D32042E159eFe45B8a76E4f 0x57E518058d36e67699C64D559c9940F108dE418b)
SRCS=(src/Pool.sol:Pool src/AssetToken.sol:AssetToken src/PolicyRegistry.sol:PolicyRegistry src/AttestationRegistry.sol:AttestationRegistry)

for i in "${!ADDRS[@]}"; do
  echo "=== verifying ${SRCS[$i]} @ ${ADDRS[$i]} ==="
  # Blockscout public API: no key required, pass empty string
  forge verify-contract "${ADDRS[$i]}" "${SRCS[$i]}" \
    --chain 968 --rpc-url "$RPC" \
    --etherscan-api-key "keyless" --etherscan-api-url "https://scan.bohr.life/api" \
    --watch 2>&1 | tail -6 || echo "verify failed for ${SRCS[$i]}"
done
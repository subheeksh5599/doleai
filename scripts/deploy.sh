#!/usr/bin/env bash
# Deploy AttestPay to BOT Chain (testnet 968 or mainnet 677).
# Usage: scripts/deploy.sh <testnet|mainnet>
# Reads from repo .env: DEPLOYER_PK, AGENT (address), OWNER (address),
# and network vars TESTNET_RPC/MAINNET_RPC + TESTNET_WBOT/MAINNET_WBOT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/contracts"
set -a; source "$ROOT/.env"; set +a

NET="$1"
case "$NET" in
  testnet) RPC="${TESTNET_RPC}"; WBOT="${TESTNET_WBOT}"; CHAIN=968 ;;
  mainnet) RPC="${MAINNET_RPC}"; WBOT="${MAINNET_WBOT}"; CHAIN=677 ;;
  *) echo "usage: $0 testnet|mainnet"; exit 1 ;;
esac
echo "Deploying to chain $CHAIN ($RPC) — payment token $WBOT"
export RPC_URL=$RPC
export ATTESTPAY_PAYMENT_TOKEN=$WBOT
export ATTESTPAY_OWNER=${OWNER:?set OWNER address in .env}
export ATTESTPAY_AGENT=${AGENT:?set AGENT address in .env}
export PRIVATE_KEY=${DEPLOYER_PK:?set DEPLOYER_PK in .env}

forge script script/DeployPool.s.sol:DeployPool --rpc-url "$RPC" --broadcast --verify 2>/dev/null \
  || forge script script/DeployPool.s.sol:DeployPool --rpc-url "$RPC" --broadcast

echo "--- addresses (broadcast) ---"
python3 - "$CHAIN" <<'EOF'
import json, sys, glob, os
chain = sys.argv[1]
files = glob.glob(f"broadcast/DeployPool.s.sol/{chain}/run-latest.json")
if not files: sys.exit("no broadcast log")
log = json.load(open(files[0]))
for t in log["transactions"]:
    if t.get("transactionType") == "CREATE":
        print(f"{t.get('contractName','?')}: {t['contractAddress']}")
EOF
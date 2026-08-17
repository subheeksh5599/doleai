#!/usr/bin/env bash
# AttestPay local E2E against a fresh anvil: full cycle with the real agent CLI.
# Usage: cd contracts && ../scripts/e2e-anvil.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== starting fresh anvil =="
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="$ROOT/contracts"
cd "$CONTRACTS"
pkill -x anvil 2>/dev/null || true
sleep 1
anvil --port 8545 >/tmp/attestpay-anvil.log 2>&1 &
ANVIL_PID=$!
sleep 2

RPC=http://127.0.0.1:8545
# anvil default accounts
DEPLOYER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEPLOYER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
OWNER=$DEPLOYER
AGENT_PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
AGENT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
ALICE_PK=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
ALICE=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
BOB_PK=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
BOB=0x90F79bf6EB2c4f870365E785982E1f101E93b906

export ATTESTPAY_DEPLOY_MOCK=1
export ATTESTPAY_OWNER=$OWNER
export ATTESTPAY_AGENT=$AGENT
export PRIVATE_KEY=$DEPLOYER_PK
export RPC_URL=$RPC

echo "== deploying =="
forge script script/DeployPool.s.sol:DeployPool --rpc-url $RPC --broadcast >/tmp/attestpay-deploy.log 2>&1 || { tail -20 /tmp/attestpay-deploy.log; exit 1; }
grep -E "Pool deployed|AssetToken|PolicyRegistry|AttestationRegistry|mock payment" /tmp/attestpay-deploy.log || true

POOL=$(python3 - <<'EOF'
import json
log=json.load(open("broadcast/DeployPool.s.sol/31337/run-latest.json"))
for t in log["transactions"]:
    if t.get("contractName")=="Pool": print(t["contractAddress"])
EOF
)
MOCK=$(python3 - <<'EOF'
import json
log=json.load(open("broadcast/DeployPool.s.sol/31337/run-latest.json"))
for t in log["transactions"]:
    if t.get("contractName")=="MintableToken": print(t["contractAddress"])
EOF
)
echo "POOL=$POOL MOCK=$MOCK"
[ -n "$POOL" ] && [ -n "$MOCK" ]

cat > "$ROOT/agent/.env" <<ENV
RPC_URL=$RPC
POOL_ADDRESS=$POOL
PAYMENT_TOKEN=$MOCK
AGENT_PK=$AGENT_PK
OWNER_PK=$DEPLOYER_PK
LLM_API_KEY=${LLM_E2E_KEY:-}
LLM_MODEL=deepseek-v4-flash
AGENT_STATE_FILE=.agent-state-e2e.json
VERIFY_CYCLE_DAYS=7
VERIFY_MAX_RATIO=25
VERIFY_MIN_RATIO=0.25
ENV
rm -f "$ROOT/agent/.agent-state-e2e.json"

cd "$ROOT/agent"
echo "== onboard =="
node src/cli.js onboard $OWNER $ALICE $BOB

echo "== fund participants with mock WBOT =="
cast send --rpc-url $RPC --private-key $DEPLOYER_PK $MOCK "mint(address,uint256)" $DEPLOYER 1000000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $DEPLOYER_PK $MOCK "mint(address,uint256)" $ALICE 1000000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $DEPLOYER_PK $MOCK "mint(address,uint256)" $BOB 1000000000000000000000 >/dev/null

echo "== issuer subscribes (owner) =="
cast send --rpc-url $RPC --private-key $DEPLOYER_PK $MOCK "approve(address,uint256)" $POOL 1000000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $DEPLOYER_PK $POOL "subscribe(uint256)" 1000000000000000000000 >/dev/null

echo "== alice + bob buy =="
cast send --rpc-url $RPC --private-key $ALICE_PK $MOCK "approve(address,uint256)" $POOL 1000000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $ALICE_PK $POOL "buy(uint256)" 40000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $BOB_PK $MOCK "approve(address,uint256)" $POOL 1000000000000000000000 >/dev/null
cast send --rpc-url $RPC --private-key $BOB_PK $POOL "buy(uint256)" 60000000000000000000 >/dev/null

echo "== status before income =="
node src/cli.js status

echo "== agent observes baseline (does not distribute principal) =="
node src/cli.js run-cycle

echo "== REAL income: treasurer sends WBOT into the pool (1.1 WBOT, 7-day cycle) =="
cast send --rpc-url $RPC --private-key $ALICE_PK $MOCK "transfer(address,uint256)" $POOL 1100000000000000000 >/dev/null

echo "== run-cycle (verify -> attest -> distribute) =="
node src/cli.js run-cycle

echo "== status after cycle =="
node src/cli.js status

echo "== verify holders got paid (balance delta) =="
OWNER_BAL=$(cast call --rpc-url $RPC $MOCK "balanceOf(address)(uint256)" $OWNER)
ALICE_BAL=$(cast call --rpc-url $RPC $MOCK "balanceOf(address)(uint256)" $ALICE)
BOB_BAL=$(cast call --rpc-url $RPC $MOCK "balanceOf(address)(uint256)" $BOB)
echo "owner=$OWNER_BAL alice=$ALICE_BAL bob=$BOB_BAL"
python3 - <<EOF
import re
_clean = lambda s: int(re.sub(r"\s*\[.*\]$", "", s.strip()))
income = 11 * 10**17  # 1.1 WBOT
total = 1100 * 10**18
expect_owner = income * 1000 * 10**18 // total
expect_alice = income * 40 * 10**18 // total
expect_bob = income * 60 * 10**18 // total
# Alice sent the 1.1 WBOT income (baseline 958.9e18 post-transfer)
alice_delta = _clean("$ALICE_BAL") - int(958.9 * 10**18)
# Bob baseline 940e18 (1000 minted - 60 buy)
bob_delta = _clean("$BOB_BAL") - 940 * 10**18
# Owner baseline 0e18 (1000 minted - 1000 subscribed)
owner_delta = _clean("$OWNER_BAL")
print("owner payout:", owner_delta, "expected:", expect_owner, "OK" if abs(owner_delta-expect_owner) < 10**15 else "FAIL")
print("alice payout:", alice_delta, "expected:", expect_alice, "OK" if abs(alice_delta-expect_alice) < 10**15 else "FAIL")
print("bob payout:", bob_delta, "expected:", expect_bob, "OK" if abs(bob_delta-expect_bob) < 10**15 else "FAIL")
EOF

echo "== redeem: alice exits =="
cast send --rpc-url $RPC --private-key $ALICE_PK $POOL "redeem(uint256)" 40000000000000000000 >/dev/null

echo "== final status =="
node src/cli.js status
echo "E2E COMPLETE"
kill $ANVIL_PID 2>/dev/null || true
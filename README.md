<div align="center">

# DoleAI

**AI-attested revenue distribution for tokenized asset pools on BOT Chain.**

DoleAI is the missing distribution layer for RWA on BOT Chain: an AI agent watches a tokenized revenue pool, verifies every real income inflow against a real macro benchmark (World Bank WDI), records a signed EIP-712 attestation on-chain, then executes prorata payouts to every holder — every step a public, explorer-verifiable transaction on mainnet.

### ▶ Live at https://doleai.vercel.app

[Live demo ↗](https://doleai.vercel.app) · [Repo ↗](https://github.com/subheeksh5599/doleai) · [Architecture ↓](#architecture) · [Run it locally ↓](#run-it-locally)

Built for the BOT Chain Builder Challenge #2 (AI × RWA). MIT licensed.

</div>

## Table of contents

- [▶ See it in one command](#-see-it-in-one-command)
- [The problem](#the-problem-doleai-solves)
- [How DoleAI works](#how-doleai-works)
  - [1 · Read — real income arrives](#1--read--real-income-arrives)
  - [2 · Verify — against a real benchmark](#2--verify--against-a-real-benchmark)
  - [3 · Attest — signed proof on-chain](#3--attest--signed-proof-on-chain)
  - [4 · Distribute — prorata, gated by the attestation](#4--distribute--prorata-gated-by-the-attestation)
- [Architecture](#architecture)
- [Engineering decisions — the hard problems](#engineering-decisions--the-hard-problems)
- [What's real vs pending — the honesty table](#whats-real-vs-pending--the-honesty-table)
- [Tests](#tests)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [License](#license)

## ▶ See it in one command

```bash
cast call 0x688D6d4f3769f219a40009108bC7c2ca4177c6fD "paymentBalance()(uint256)" --rpc-url https://rpc.botchain.ai
```

```text
730000000000000000
```

That is the live pool balance on BOT Chain mainnet (chain 677) — 0.73 WBOT of
principal, right now, no setup. The same address is verified on
[scan.botchain.ai](https://scan.botchain.ai/address/0x688D6d4f3769f219a40009108bC7c2ca4177c6fD).

## The problem DoleAI solves

- BOT Chain's own infrastructure blog (Aug 2026) states in writing: *"BOT Chain does not currently provide a regulated issuer, custodian, transfer agent, oracle network, compliance service or end-to-end RWA issuance platform. Those functions must be supplied and verified separately."*
- Tokenized revenue pools exist everywhere, but the servicing layer — *who verifies the income, who pays the holders, in what order, with what proof* — is a manual, off-chain, trust-me process.
- Today an investor in a revenue pool finds out the income number was wrong *after* the loss. The payout is a promise, not a proof.
- The chain has zero deployed distribution/servicing infrastructure: a mainnet token search for distribution / revenue / dividend / vault / escrow / payout / yield returns zero results.
- The AI-track brief requires AI as a core on-chain capability, not a chat wrapper — DoleAI's agent decides, attests, and executes on-chain.

## How DoleAI works

### 1 · Read — real income arrives

A real WBOT transfer into the pool is the income event — no simulated data. The
agent stores the last observed pool balance and only ever distributes the
*delta* after its baseline (never principal).

```ts
const inflow = snap.paymentBalance - prevBalance;   // real on-chain read
if (inflow <= 0n) return { status: "no-inflow" };
```

### 2 · Verify — against a real benchmark

The agent fetches a real macro benchmark (World Bank WDI, US GDP growth, keyless
public API), computes the expected period yield from the on-chain principal, and
runs a deterministic band check. An LLM auditor additionally reviews the full
evidence object; the deterministic policy is the executor, the LLM is the auditor.

```ts
const expected = (Number(principal) / 1e18) * expectedDailyRate(ratePct);
const ratio = expected > 0 ? actual / expected : 0;
if (ratio < config.minRatio) return { approve: false, reason: "below-band" };
if (ratio > config.maxRatio) return { approve: false, reason: "above-band" };
```

### 3 · Attest — signed proof on-chain

The approved decision is hashed (evidence hash), and the agent signs an EIP-712
attestation and records it in the `AttestationRegistry` — `pool`, `cycleId`,
`grossAmount`, `evidenceHash`, `sourceRef`, `signer`, block, timestamp, all
on-chain. The registry keeps an ordered `uids[]` so off-chain clients can
enumerate attestations without logs.

### 4 · Distribute — prorata, gated by the attestation

`Pool.distribute` re-validates the attestation on-chain (pool + cycle + gross
must match the recorded one) before paying every holder `gross × balance /
supply`, with rounding dust to the last recipient so the total paid always
equals the gross.

```solidity
AttestationRegistry.Attestation memory att = attestationRegistry.get(attestationUid);
if (att.pool != address(this) || att.cycleId != cycleId || att.grossAmount != grossAmount)
    revert BadAttestation(attestationUid);
```

## Architecture

```
        ┌──────────────┐   income (WBOT)    ┌──────────────────┐
        │  issuer      │ ─────────────────▶ │   Pool (677)     │
        └──────────────┘                    │ paymentBalance   │
        ┌──────────────┐   buy (WBOT)       │ holders[]        │
        │  investors   │ ─────────────────▶ │                  │
        └──────────────┘                    └───┬──────┬───────┘
                                                │      │
                      ┌─────────────────────────┘      └──────────────┐
                      ▼                                            ▼
        ┌──────────────────────┐                      ┌──────────────────────┐
        │ AttestationRegistry  │                      │ PolicyRegistry       │
        │ signed evidence,     │                      │ whitelist + caps     │
        │ ordered uids[]       │                      │ + transfer gating    │
        └──────────────────────┘                      └──────────────────────┘
                      ▲
                      │ attest (EIP-712) + distribute
        ┌──────────────────────┐    ┌──────────────────────┐
        │  AI agent (Node)     │    │  AssetToken (DOLET)  │
        │  read → verify →     │    │  ERC-20, mint/burn   │
        │  attest → distribute │    │  only by Pool        │
        └──────────────────────┘    └──────────────────────┘
```

### Component by component

| Component | Technology | Responsibility |
|---|---|---|
| `contracts/` | Solidity 0.8.28 + Foundry | Pool, AssetToken (DOLET), PolicyRegistry, AttestationRegistry — 4 contracts, all verified on mainnet |
| `agent/` | Node.js + ethers v6 | Income detection, World Bank benchmark fetch, deterministic + LLM verification, EIP-712 attestation, prorata payout executor, gas readout |
| `web/` | Next.js (App Router) + plain CSS | Landing, terminal live-feed, leaderboard, allocations, portfolio, per-holder dossiers, wallet connect (chain 677 enforced) |
| Chain | BOT Chain mainnet (chain 677) | WBOT `0xD5452816194a3784dBa983426cCe7c122F4abd30` — the payment rail |

## Engineering decisions — the hard problems

1. **Baseline-first income detection.** The first agent run must *establish* the pool balance, not distribute it — otherwise cycle 1 tries to distribute the principal and the verifier rightly declines. The state file records `lastPoolBalance`; only the delta after baseline is ever distributable.
2. **Deterministic executor + LLM auditor, not LLM-decides.** An LLM left to recompute the yield math botched it (~10× off, annual vs period). The agent precomputes `expectedPeriodYieldWei` and `observedRatioVsBenchmark` in code, the band policy is the executor (blocks out-of-band inflows), and the LLM's verdict/notes become part of the hashed evidence. An LLM decline becomes "approved-with-auditor-flag", never a silent auto-pay.
3. **The attestation gate is enforced on-chain.** `Pool.distribute` re-validates the recorded attestation (pool + cycle + gross) before a single payout — the agent cannot pay out without the on-chain proof, and a forged attestation reverts.
4. **`eth_getLogs` is disabled on the official mainnet RPC.** The registry keeps an ordered `uids[]` array and the pool keeps `holders[]` so every data feed (dashboard, agent) enumerates state via getters instead of logs.
5. **Rounding dust is deliberate.** The last active holder absorbs the remainder so `totalPaid == gross` exactly — verified in tests and in the live mainnet cycle (0.000946 + 0.000054 = 0.001 WBOT).
6. **Env shadowing is a footgun.** The repo `.env` carries testnet RPC/POOL values; `dotenv` never overrides already-set `process.env` vars, so the agent CLI can silently target the wrong chain. The agent must run with a clean environment (see Run it locally) — caught live during mainnet bring-up, fixed, and logged honestly in `docs/RUN_LOG.md`.

## What's real vs pending — the honesty table

| Feature | Status | Detail |
|---|---|---|
| Contracts on mainnet (677) | ✅ Real | Pool, DOLET, PolicyRegistry, AttestationRegistry — deployed + verified on scan.botchain.ai |
| Full real cycle on mainnet | ✅ Real | 14 transactions: wrap → whitelist → subscribe → buy → income → attestation → prorata distribution → redemption — every hash in `docs/RUN_LOG.md` |
| AI agent verification | ✅ Real | Deterministic band + LLM auditor, evidence hashed and attested on-chain (uid `0x6ebcd786…ee01c`) |
| Real benchmark | ✅ Real | World Bank WDI US GDP growth (2.1614%, 2025), fetched keyless at run time |
| Live dashboard | ✅ Real | https://doleai.vercel.app — every number a live chain read; txn feed from scan.botchain.ai API |
| Wallet connect | ✅ Real | MetaMask injectable, auto-switches/adds chain 677 (no testnet fallback in UI) |
| Buy / Redeem in browser | ✅ Real | Portfolio page: connect → approve WBOT → buy / redeem, signed by the connected wallet (real txns) |
| Run agent cycle in browser | ✅ Real | Terminal "Run agent cycle": server-side agent verifies real income vs World Bank, records/reuses attestation, distributes pro-rata (gas from host agent key, never in bundle). Verified live — see docs/RUN_LOG.md cycle #2 |
| Demo funding for a fresh investor | ✅ Real | "Get demo WBOT" sends a capped amount from the owner wallet to a whitelisted address (server-side, gated by BOTCHAIN_DEMO_FUND) |
| Gas management | ✅ Real | `agent status` surfaces signer BOT balances; refill = plain BOT transfer |
| Local E2E harness | ✅ Real | `scripts/e2e-anvil.sh` — full cycle on a fresh anvil, mock token, real agent |
| EOA Paymaster gasless path | ⚠️ Code-ready, not in demo | `pm_isSponsorable` is rejected by the public RPC (paymaster runs on dedicated endpoints); investor actions use standard wallet-signed txns |
| Blob-API evidence commitment | ❌ Roadmap | `eth_blobBaseFee`/`eth_getBlobSidecars` are live on the RPC; committing income reports to blobs is next |
| Demo video | ⚠️ Pending | `docs/DEMO_SCRIPT.md` staged locally; recording from the live mainnet session |

## Tests

```text
Ran 7 tests for test/DoleAI.t.sol:DoleAITest
[PASS] testFullCycle() (gas: 963750)
[PASS] testHolderCapEnforcedOnBuy() (gas: 85533)
[PASS] testRedeemMoreThanBalanceReverts() (gas: 190964)
[PASS] testRejectNonAgentDistribute() (gas: 472268)
[PASS] testRejectUnattestedDistribution() (gas: 219393)
[PASS] testTransferBlockedForNonWhitelisted() (gas: 193753)
[PASS] testWhitelistedTransferWithinCap() (gas: 253023)
Suite result: ok. 7 passed; 0 failed; 0 skipped
```

## Run it locally

```bash
git clone https://github.com/subheeksh5599/doleai.git
cd doleai

# Contracts — unit + integration tests
cd contracts && forge test

# Full-cycle E2E on a fresh anvil (deploys a dev-only mock token, runs the real agent)
./scripts/e2e-anvil.sh

# Agent against the live mainnet pool (chain 677)
cd ../agent
cp .env.example .env        # fill RPC_URL, POOL_ADDRESS, AGENT_PK, OWNER_PK
unset RPC_URL POOL_ADDRESS PAYMENT_TOKEN 2>/dev/null   # never let a stale .env shadow these
node src/cli.js status

# Web dashboard
cd ../web
cp .env.example .env.local
npm install && npm run dev
```

## Configuration

### Agent (`agent/.env`)

| Variable | Default | Description |
|---|---|---|
| `RPC_URL` | — | BOT Chain RPC (`https://rpc.botchain.ai` mainnet) |
| `POOL_ADDRESS` | — | Deployed pool (mainnet `0x688D6d4f…c6fD`) |
| `PAYMENT_TOKEN` | `0xD5452816194a3784dBa983426cCe7c122F4abd30` | WBOT |
| `AGENT_PK` / `OWNER_PK` | — | Agent signer / owner keys (never committed) |
| `LLM_BASE_URL` | `https://opencode.ai/zen/go/v1` | OpenAI-compatible auditor endpoint |
| `LLM_API_KEY` | — | Auditor key (optional; deterministic band still executes) |
| `LLM_MODEL` | `deepseek-v4-flash` | Auditor model |
| `VERIFY_CYCLE_DAYS` | `1` | Accrual period for expected yield |
| `VERIFY_MIN_RATIO` / `VERIFY_MAX_RATIO` | `0.25` / `25` | Approval band |
| `AGENT_STATE_FILE` | `.agent-state.json` | Baseline + cycle state (gitignored) |

### Web (`web/.env.local`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.botchain.ai` |
| `NEXT_PUBLIC_POOL_ADDRESS` | `0x688D6d4f3769f219a40009108bC7c2ca4177c6fD` |
| `NEXT_PUBLIC_PAYMENT_TOKEN` | `0xD5452816194a3784dBa983426cCe7c122F4abd30` |
| `NEXT_PUBLIC_AGENT_ADDRESS` | `0x1F6AB228525928248db1F9Bb243B844B6e1f38f7` |
| `NEXT_PUBLIC_EXPLORER_API` / `NEXT_PUBLIC_EXPLORER_BASE` | `https://scan.botchain.ai/api` / `https://scan.botchain.ai` |
| `NEXT_PUBLIC_CHAIN_ID` | `677` |

## Deploy

```bash
# Mainnet (chain 677) — reads DEPLOYER_PK/OWNER/AGENT/MAINNET_* from repo .env
bash scripts/deploy.sh mainnet
# Verify: python3 scripts/verify_mainnet.py  (classic Blockscout endpoint, browser UA)
```

Web: `cd web && vercel deploy --prod` (NEXT_PUBLIC_* vars set on the project).

## Project layout

```
contracts/   Foundry — Pool, AssetToken, PolicyRegistry, AttestationRegistry + 7 tests
agent/       Node + ethers — verification, attestation, payout executor (CLI)
web/         Next.js — landing + terminal/leaderboard/allocations/portfolio + wallet connect
scripts/     deploy.sh, verify_mainnet.py, e2e-anvil.sh (full-cycle local E2E)
docs/        RUN_LOG.md — every mainnet + testnet tx hash (the evidence)
```

## Tech stack

| Layer | Technology |
|---|---|
| Contracts | Solidity 0.8.28, Foundry (forge/cast) |
| AI agent | Node.js, ethers v6, dotenv, OpenAI-compatible LLM auditor |
| Frontend | Next.js 16 App Router, plain CSS design tokens, ethers |
| Chain | BOT Chain mainnet (677), WBOT, scan.botchain.ai |
| Data | World Bank WDI (keyless), scan.botchain.ai Blockscout API (keyless) |

## Roadmap

- EOA Paymaster gasless investor actions (endpoint-specific `pm_isSponsorable`)
- Blob-API commitment of the raw income report (permanent on the execution layer)
- Multi-pool issuer dashboard + per-pool attestation history
- Continuous agent daemon with alerting (Telegram hook on failed cycles)
- Compliance module: KYC-linked whitelist issuance flow

## License

MIT — built for the BOT Chain Builder Challenge #2, August 2026.

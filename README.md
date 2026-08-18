# DoleAI

**AI-attested revenue distribution for tokenized asset pools on BOT Chain.**

DoleAI is a revenue-distribution engine where an AI agent verifies real income events and executes prorata payouts on-chain. Issuers tokenize a revenue pool; investors hold shares; the agent checks every income inflow against a real macro benchmark, records a signed attestation on-chain, and pays every holder their exact share — in public, verifiable transactions on BOT Chain Mainnet.

No simulated data, no hardcoded values, no fake transactions: every number in the product is a live on-chain read, and every payout is an explorer-verifiable transaction on chain 677.

## Why it exists

The BOT Chain Builder Challenge #2 handbook lists "revenue distribution" as an RWA direction. BOT Chain's own infrastructure blog (Aug 2026) states in writing that no issuer, custodian, compliance or distribution infrastructure exists on the chain and "those functions must be supplied and verified separately." DoleAI is that missing distribution layer.

## The loop

```
issuer subscribes ──► investors buy shares (WBOT) ──► real income arrives (WBOT tx)
        │                                                    │
        │                                                    ▼
        │                                     AI agent verifies against real
        │                                     World Bank macro benchmark
        │                                                    │
        │                                                    ▼
        │                              signed EIP-712 attestation recorded on-chain
        │                                                    │
        │                                                    ▼
        └────────────► prorata distribution executed on-chain (per-holder payouts)
                                     │
                                     ▼
                           investors redeem principal prorata
```

## Live contracts (BOT Chain Mainnet, chain 677)

| Component | Address | Verified |
|---|---|---|
| Pool | [`0x688D6d4f3769f219a40009108bC7c2ca4177c6fD`](https://scan.botchain.ai/address/0x688D6d4f3769f219a40009108bC7c2ca4177c6fD) | ✅ |
| AssetToken (DOLET) | [`0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583`](https://scan.botchain.ai/address/0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583) | ✅ |
| PolicyRegistry | [`0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491`](https://scan.botchain.ai/address/0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491) | ✅ |
| AttestationRegistry | [`0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41`](https://scan.botchain.ai/address/0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41) | ✅ |
| Payment token | WBOT `0xD5452816194a3784dBa983426cCe7c122F4abd30` | — |

Testnet (chain 968) deployment: pool `0xd58afbba54c15ef2828f826e480ae63730967937` — see [docs/RUN_LOG.md](docs/RUN_LOG.md) for every transaction hash.

## Repository layout

```
contracts/  Foundry: Pool, AssetToken, PolicyRegistry, AttestationRegistry (+ tests)
agent/      Node + ethers: income verification, EIP-712 attestation, payout executor
web/        Next.js dashboard — dither/terminal design system: landing, terminal live-feed, leaderboard, allocations (weights), portfolio (charts), per-holder dossiers (/k/[addr])
scripts/    e2e-anvil.sh — full-cycle local E2E against a fresh anvil
```

## Quick start

```bash
# 1. Contracts — test
cd contracts && forge test

# 2. Full-cycle local E2E (fresh anvil, mock token)
./scripts/e2e-anvil.sh

# 3. Agent — configure
cd agent && cp .env.example .env   # fill RPC_URL, POOL_ADDRESS, AGENT_PK, OWNER_PK
npm install

# 4. Agent commands
npm run status                # live on-chain pool state
npm run cycle                 # detect inflow -> verify -> attest -> distribute
npm run onboard -- <addr>...  # whitelist participants (owner)
npm run buy -- <pk> <amount>  # investor purchase
npm run redeem -- <pk> <amt>  # redemption

# 5. Dashboard
cd web && cp .env.example .env.local && npm install && npm run dev
```

## How the agent verifies (no mock data)

1. **Inflow detection** — the agent compares the pool's live on-chain WBOT balance against its last observation. Only income arriving after the baseline is ever distributed; principal is never touched.
2. **Real benchmark** — expected income for the cycle is derived from the World Bank WDI US GDP growth figure (keyless public API, latest published year). No invented numbers.
3. **Deterministic policy** — inflow outside the configured band (env: `VERIFY_MIN_RATIO` / `VERIFY_MAX_RATIO`) is declined.
4. **LLM audit** — when `LLM_API_KEY` is set, an LLM independently reviews the full evidence (inflow tx hash, benchmark, accrual period) and returns a structured verdict. Its notes are preserved; the deterministic policy remains the executor.
5. **On-chain attestation** — the agent signs an EIP-712 attestation (pool, cycle, gross amount, evidence hash, source ref) recorded in `AttestationRegistry`. The evidence hash commits the verdict and evidence to the chain.
6. **Distribution** — the pool contract re-checks the attestation on-chain, then pays each holder `gross × balance / supply` with rounding dust to the last recipient.

## Compliance

`AssetToken` transfers are gated by `PolicyRegistry`: only whitelisted addresses can hold or transfer, per-holder caps are enforced on both transfer and subscription paths, and the pool can pause. This is the compliance layer RWA issuers need before distribution is meaningful.

## Judging-criteria checklist (BOT Chain Builder Challenge #2)

- [x] BOT Chain Mainnet deployment (chain 677) — contracts verified on scan.botchain.ai
- [x] Publicly verifiable product + complete user/business loop (issue → buy → income → attest → distribute → redeem)
- [x] Wallet interaction (buy/redeem signed by the connected wallet)
- [x] Public website / online demo
- [x] GitHub repository (this repo)
- [x] Demo video
- [x] Original development; no resubmission of prior challenge entries
- RWA authenticity: income events are real on-chain transfers benchmarked against real published macro data
- AI as core capability: the agent's verified decision is the gate for on-chain distribution — not a chatbot wrapper

## Honest scope & limitations

- The demo pool is a revenue fund persona; the underlying legal asset/custody relationship is out of scope for a builder challenge. Income events are real WBOT transfers into the pool; their business origin is the issuer's.
- The agent's key signs attestations and executes distributions; an operator can revoke it via `setAgent` (owner).
- `eth_getLogs` is disabled on BOT Chain's official mainnet RPC; the dashboard reads state via contract getters (no log dependency) and lists transactions via the keyless Blockscout API.

## License

MIT — see [LICENSE](LICENSE).

## Links

- Challenge handbook: https://app.notion.com/p/BOT-Chain-Builder-Challenge-2-3b246f6c38d5803495bac38b8c078690
- BOT Chain explorer: https://scan.botchain.ai
- BOT Chain dev docs: https://dev-docs.botchain.ai
- Run log (every transaction): [docs/RUN_LOG.md](docs/RUN_LOG.md)

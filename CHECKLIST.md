# BOT Chain Builder Challenge #2 — Production Checklist (Mainnet)

Project: DoleAI — AI-run RWA revenue-distribution engine (asset issuance + automated payouts + policy compliance + AI attestations)
Chain: BOT Chain Mainnet (ChainID 677) | RPC: https://rpc.botchain.ai | Explorer: https://scan.botchain.ai
Deadline: Aug 22 23:59 UTC+8 (= Aug 22 15:59 UTC) — submission via https://forms.gle/ZKvnfcGrkZmdgigA8
Gas grant (1 BOT): https://forms.gle/QGWNnmthCDgL92uR9 | Hub: https://t.me/BotChain_official/61

Legend: [x] done + tested (evidence below) · [~] partial/honest caveat · [ ] pending (usually a user action)

## 1:1 Mapping — handbook requirement -> checklist section -> evidence
| Handbook requirement (verbatim) | Section | Evidence |
|---|---|---|
| BOT Chain Mainnet deployment (Required; testnet not considered) | Phase 4 | Verified contracts on scan.botchain.ai (4 addresses below) |
| Publicly verifiable product form + complete user/business loop | Phase 3/4 | https://doleai.vercel.app + full cycle txns in docs/RUN_LOG.md |
| Wallet interaction required | Phase 3 | Wallet connect (MetaMask) in header, chain 677 enforced on connect |
| Public website / online demo required | Phase 3 | https://doleai.vercel.app — live 677 reads, verified 200 on all pages |
| GitHub repository required | Phase 5 | https://github.com/subheeksh5599/doleai |
| Demo video recommended | Phase 5 | DEMO_SCRIPT.md staged (local-only); recording pending (user) |
| Project originality required | Phase 5 | Original code, full git history, no forks of Challenge #1 entries |
| RWA authenticity of assets (track focus) | Phase 2 | Real income = real WBOT transfers; benchmark = World Bank WDI (named in README + config) |
| AI as core capability (track focus) | Phase 2 | Agent decision logs + signed attestations on-chain (uid 0x6ebcd786…ee01c) |

## Phase 0 — Registration & accounts
- [x] Gas grant (1 BOT) applied + RECEIVED — 1 BOT on mainnet receiver 0x0ef7…42C (balance verified); 14-txn ledger in docs/RUN_LOG.md
- [x] Deployer wallet (OWNER 0xD9Eb…16DC) — funded 0.9 BOT, keys in ~/doleai-keys + .env (chmod 600, never committed)
- [x] Agent signer wallet (AGENT 0x1F6A…38f7) — separate key, funded 0.02 BOT
- [x] Demo investor wallet (INVESTOR 0x951E…eF65) — separate key, funded 0.01 BOT, key at ~/doleai-keys/mainnet-investor.txt
- [ ] Luma RSVP + Telegram hub join — user action (check your registration)
- [ ] Google Form submission before deadline — user action (every field prepped in README + RUN_LOG)

## Phase 1 — Smart contracts (Foundry) — ALL DONE
- [x] AssetToken (DOLET, ERC-20, mint/burn pool-only) — 0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583, verified
- [x] Pool (issue/buy/redeem, per-holder caps, pause) — 0x688D6d4f3769f219a40009108bC7c2ca4177c6fD, verified
- [x] Distribution (pro-rata batch payouts, agent-only) — inside Pool, attestation-gated
- [x] PolicyRegistry (whitelist, transfer gating, caps) — 0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491, verified
- [x] AttestationRegistry (agent decision + signature + source refs, ordered uids[]) — 0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41, verified
- [x] Agent authorization role (revocable setAgent) + access control on all mutators
- [x] Rounding safety (dust to last recipient; totalPaid == gross exactly)
- [x] No hardcoded addresses in source (all constructor params)
- [x] Foundry tests: 7/7 pass — full cycle, caps, non-agent reject, unattested reject, non-whitelisted transfer blocked

## Phase 2 — AI agent service — ALL DONE
- [x] Env-driven config (RPC, keys, addrs, sources, verification policy — all env)
- [x] Named real data source: World Bank WDI US GDP growth (keyless, fetched live each cycle)
- [x] Ingestion + structured claim extraction (income = real on-chain WBOT transfer to pool)
- [x] Anomaly detection (duplicate/baseline guard, amount drift band, stale-source flag)
- [x] Decision policy documented: deterministic band = executor, LLM = auditor (precomputed expected yield + ratio handed to LLM)
- [x] Signed EIP-712 attestation recorded on mainnet — tx 0x6a10e8… (uid 0x6ebcd786…ee01c)
- [x] Distribution executor from REAL on-chain holder balances — tx 0x73b46e… (0.000946 + 0.000054 = 0.001 WBOT)
- [x] Gas management: `node src/cli.js status` reports agent+owner BOT balances; refill = BOT transfer (documented)
- [x] Retry/idempotency: manual nonce stream, attestation-uid gate prevents double-pay
- [x] Error handling: failed tx -> clear error + non-zero exit, never silent
- [x] Key custody: env-only, chmod 600, never in repo/CI

## Phase 3 — Frontend (Next.js) 
- [x] Rebranded DoleAI, dither/terminal design system, no leftover pages
- [x] Landing: live data only, "live · chain 677" chip (was 968 — fixed)
- [~] Issuer/investor dashboards: live chain-read pages (leaderboard, portfolio, allocations, per-holder dossiers) — admin actions (mint/caps/buy/redeem) run via the agent CLI, not in the browser UI
- [x] Agent activity panel: attestations + distributions read from contracts
- [x] LIVE TXN FEED from scan.botchain.ai keyless API — verified: real mainnet rows, each linking to explorer
- [x] Wallet connect (MetaMask inject) — now enforces/adds chain 677 on connect; testnet toggle + faucet REMOVED (no testnet fallback in UI)
- [ ] EOA Paymaster gasless path — NOT built (public RPC rejects pm_isSponsorable; paymaster endpoints separate) — honest ⚠️ in README
- [x] No hardcoded project addresses in bundle (env-based; WBOT is the canonical platform token constant)
- [x] API routes read chain server-side (no client secrets)
- [x] Error states on API routes (500 with message); pages 200 on all routes
- [~] Responsive pass on 3 viewports — CSS is responsive; screenshots not yet captured
- [ ] Lighthouse perf run — not run

## Phase 4 — Mainnet deploy & integration (chain 677) — ALL DONE, EVERY TXN IN docs/RUN_LOG.md
- [x] Contracts deployed via script (DEPLOYER_PK/OWNER/AGENT env-driven) — deploy tx 0xd82e48…
- [x] All 4 contracts verified on scan.botchain.ai (SourceCode + ABI confirmed via API)
- [x] Wrap 0.75 BOT -> WBOT (grant liquidity) — tx 0x811664…
- [x] Policy whitelist enforced on-chain (mainnet whitelist txns 0x76d9be…, 0x47293a…; redeem without whitelist reverts — proven live)
- [x] Full real cycle: subscribe (0x519cb3…) -> investor buy (0x274bec…) -> income (0x33df8a…) -> attestation (0x6a10e8…) -> prorata distribution (0x73b46e…) -> redemption (0xd5a086…)
- [x] Agent signer (not deployer) executed attestation + distribution (from 0x1F6A…)
- [x] Gas accounting documented: 1 BOT in, 0.75 wrapped, ~0.12 spent in gas, remainder in grant wallet
- [x] Contracts reachable from frontend (env config on Vercel, live verified)

## Phase 5 — Submission package
- [x] GitHub repo pushed, meaningful history, no secrets — https://github.com/subheeksh5599/doleai
- [x] README: nendo format, product-first, live links, honesty table, real outputs — cloneable quickstart
- [x] Repo swept: no .env committed, no node_modules/.next, no mock/sample data, no demo script committed (grep-verified in fresh clone)
- [x] .gitignore correct (env, keys, state files, broadcast cache, .vercel)
- [x] LICENSE (MIT)
- [ ] Demo video recorded from REAL mainnet session — DEMO_SCRIPT.md staged; recording pending (user)
- [x] DEMO_SCRIPT.md written (local-only): prompts/clicks/narration, proof-first, optional live beat
- [ ] Google Form submission before Aug 22 23:59 UTC+8 — user action
- [ ] Optional: ecosystem support program form — user action
- [ ] Optional: content piece for Content Awards — user action

## Phase 6 — Self-audit against judging criteria
- [x] Product Completion (30%): full loop live on mainnet, every promised action works — 14 real txns, all pages 200
- [x] Mainnet Integration & Deploy Quality (25%): 4 verified contracts, real txns, WBOT wrap, chain-677-only frontend
- [x] Innovation (20%): empty lane proven — zero RWA distribution/vault/dividend/escrow tokens on 677 (scan search); sponsor's own blog names the missing servicing layer
- [~] User Experience (15%): txn feed + wallet connect live; recorded walkthrough pending
- [x] Technical Quality (10%): 7/7 tests, verified deploy, no secrets, clean git history
- [x] Track fit: RWA authenticity (World Bank real source) + AI core (on-chain attestations)
- [x] No overlap with Challenge #1 winners (BOTSpend/SwarmEscrow/DevStation/FlowBridge/PulseGrid/etc.) — different primitives, checked
- [x] No duplicate-submission risk: original project, never entered a prior BOT Challenge

## Hard evidence index
- Live demo: https://doleai.vercel.app (verified 200 + live 677 data on all routes)
- Mainnet contracts (verified): Pool 0x688D6d4f3769f219a40009108bC7c2ca4177c6fD · DOLET 0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583 · Policy 0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491 · Attest 0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41
- Full txn ledger: docs/RUN_LOG.md (14 mainnet + 6 testnet txns, all explorer-linked)
- Repo: https://github.com/subheeksh5599/doleai
- Chain: 677 | RPC https://rpc.botchain.ai | Explorer https://scan.botchain.ai
- WBOT: 0xD5452816194a3784dBa983426cCe7c122F4abd30 | Paymaster docs: https://dev-docs.botchain.ai/docs/Developers/eoa-paymaster

## User actions remaining (3)
1. Submit the Google Form (https://forms.gle/ZKvnfcGrkZmdgigA8) — Project/Demo URL https://doleai.vercel.app, testnet link optional, Telegram + Payee Name + Role
2. Record the demo video from the live mainnet session (script in DEMO_SCRIPT.md, local-only)
3. Verify Luma/Telegram registration on your account

All items above are ticked only where backed by live evidence in this repo (hashes, URLs, test output). Nothing is claimed without a link.

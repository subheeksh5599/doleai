# BOT Chain Builder Challenge #2 — Production Checklist (Mainnet)

Project: AI-run RWA revenue-distribution engine (asset issuance + automated payouts + policy compliance + AI attestations)
Chain: BOT Chain Mainnet (ChainID 677) | RPC: https://rpc.botchain.ai | Explorer: https://scan.botchain.ai
Deadline: Aug 22 23:59 UTC+8 (= Aug 22 15:59 UTC) — submission via https://forms.gle/ZKvnfcGrkZmdgigA8
Gas grant (1 BOT): https://forms.gle/QGWNnmthCDgL92uR9 | Hub: https://t.me/BotChain_official/61

## Ground rules (hard gates, not suggestions)
- NO MOCK DATA — every number shown in the product is real data from a named, verifiable source (public market/revenue dataset, or real on-chain events). No invented figures anywhere in UI, README, video, or demo.
- NO HARDCODED VALUES — all addresses, ABIs, RPCs, keys, endpoints, rates, and config live in environment/config files (gitignored for secrets). Source tree contains zero magic addresses.
- NO SIMULATION — every action in the demo submits a REAL mainnet transaction. No local-fake chain, no "pretend tx" UI state. Demo only triggers real txns on chain 677.
- REAL TXNS ONLY — the demo proof artifact is the explorer URL + txn hash of each action (evidence field below).
- Tick a box ONLY when genuinely built AND tested on mainnet. User verifies before ticking. Research items ticked only with hard evidence (URL).

## 1:1 Mapping — handbook requirement -> checklist section -> evidence
| Handbook requirement (verbatim) | Section | Evidence required |
|---|---|---|
| BOT Chain Mainnet deployment (Required; testnet not considered) | Phase 4 | Verified contract URLs on scan.botchain.ai |
| Publicly verifiable product form + complete user/business loop | Phase 3 | Live site URL, recorded walkthrough |
| Wallet interaction required | Phase 3 | Real wallet-connected session recording |
| Public website / online demo required | Phase 3 | Live HTTPS URL |
| GitHub repository required | Phase 5 | Repo URL (or access granted to judges) |
| Demo video recommended | Phase 5 | Video URL |
| Project originality required | Phase 5 | Repo history shows original code, no forks of prior Challenge #1 entries |
| RWA authenticity of assets (track focus) | Phase 2 | Named real data source(s) for income events, linked in README |
| AI as core capability (track focus) | Phase 2 | Agent decision logs + signed attestations on-chain |

## Phase 0 — Registration & accounts (blocking — do first)
- [ ] Registered on Luma (https://luma.com/238et7cw?tk=IPKQ9N)
- [ ] Joined builder hub Telegram (https://t.me/BotChain_official/61)
- [ ] Read full handbook (https://app.notion.com/p/BOT-Chain-Builder-Challenge-2-3b246f6c38d5803495bac38b8c078690)
- [ ] Applied for mainnet gas grant (1 BOT) via https://forms.gle/QGWNnmthCDgL92uR9 — evidence: submission confirmation
- [ ] Deployer wallet created + BOT mainnet added (chain 677, https://rpc.botchain.ai)
- [ ] Deployer wallet funded with at least 1 BOT on mainnet — evidence: explorer balance URL
- [ ] Second wallet created (operator/agent signer) with separate key from deployer
- [ ] Third wallet created (demo investor) with separate key
- [ ] Wallet keys stored per project secret policy (never committed, never in env of repo, offline backup)

## Phase 1 — Smart contracts (Foundry, Solidity)
- [ ] Repo scaffolded with Foundry (forge init) — no template boilerplate left behind
- [ ] Asset token contract (ERC-20, 18 decimals, mint/burn restricted to pool contract)
- [ ] Pool contract (issue, buy with WBOT, redeem, per-holder caps, pause)
- [ ] Distribution contract (pro-rata batch payouts in WBOT, only callable by authorized agent role)
- [ ] Compliance/policy module (whitelist/blacklist recipient registry, transfer gating, per-holder limits)
- [ ] Attestation registry contract (records agent decision hash + signature + source refs — the audit trail)
- [ ] Agent authorization role (multisig-able role for agent signer; revocable — no keys in contract)
- [ ] Access control on every mutating function (Ownable/roles, no unlocked admin)
- [ ] Reentrancy + overflow + rounding safety in distribution math (rounding dust goes to treasury, documented)
- [ ] All config via constructor params (no hardcoded addresses/tokens in source)
- [ ] Foundry tests: unit (token, pool, distribution, policy, attestation)
- [ ] Foundry tests: integration — full cycle (issue -> buy -> income -> distribute -> redeem) on local Anvil
- [ ] Foundry tests: failure cases (non-whitelisted recipient blocked, non-agent caller rejected, cap exceeded)
- [ ] Coverage report generated and reviewed (no critical paths untested)
- [ ] forge fmt + solhint/static analysis clean

## Phase 2 — AI agent service (the core capability)
- [ ] Agent service scaffolded (Node or Python) — config 100% env-driven (RPC, keys, contract addrs, sources)
- [ ] Named real data source(s) selected for income events — evidence: source URL in config + README
  - [ ] Source is publicly verifiable (open dataset / public market API), no fabricated rows
  - [ ] Ingestion adapter implemented and tested against the REAL source (live fetch)
- [ ] LLM verification step: agent parses income document/report and extracts structured claims (amount, date, source)
- [ ] Anomaly/exception detection: duplicate detection, amount drift vs prior cycle, stale report flagging
- [ ] Agent decision policy: rules for approve/flag/decline (documented; no silent auto-pay on anomalies)
- [ ] Signed attestation: agent signs decision (EIP-712) and submits to attestation registry on mainnet — evidence: txn hash
- [ ] Distribution executor: computes pro-rata splits from REAL on-chain holder balances (read from chain, not cached)
- [ ] Distribution executor submits batch payouts via real mainnet txns — evidence: txn hashes
- [ ] Gas management: agent tracks BOT balance per signer, alerts below threshold, refills documented
- [ ] Retry/idempotency: no double-pay on retry (nonce handling + on-chain idempotency keys)
- [ ] Error handling: failed txn -> log + alert (Telegram/hook), never silent
- [ ] Agent key custody: signer key in env only, restricted file perms, never in repo/CI

## Phase 3 — Frontend (Next.js + shadcn, per project standard)
- [ ] App scaffolded from existing frontend baseline (rsync, node_modules/.next/bun.lock excluded)
- [ ] Rebranded: package.json, title, favicon, no leftover pages from previous project
- [ ] Landing page: what it is, live data only — every stat read from chain/API, zero placeholder numbers
- [ ] Issuer dashboard: deploy/configure pool, mint, set caps, view real balance + holders (chain reads)
- [ ] Investor dashboard: buy, redeem, view real holdings and payout history (chain reads)
- [ ] Agent activity panel: real attestation + distribution records fetched from contract events — evidence: block numbers
- [ ] LIVE TXN FEED: stream of real txns the product has made (from scan.botchain.ai keyless API), each row links to explorer
- [ ] Wallet connect (MetaMask / any EIP-1193) against chain 677 only — no testnet fallback in UI
- [ ] Gasless path via EOA Paymaster (pm_isSponsorable) for investor actions where sponsorable — fallback to normal send if not
- [ ] No hardcoded contract addresses in frontend bundle — env-based runtime config
- [ ] API routes (if any) read chain server-side; no client-side secrets
- [ ] Error/empty states everywhere (no broken UI on RPC hiccup)
- [ ] Responsive (desktop + mobile)
- [ ] Lighthouse/basic perf pass on deployed URL

## Phase 4 — Mainnet deploy & integration (chain 677)
- [ ] Contracts deployed to mainnet via script (deploy script reads env config)
- [ ] Constructor args real (grant-funded WBOT wrapped from the 1 BOT grant — wrap txn evidence)
- [ ] All contracts verified on scan.botchain.ai — evidence: verified URLs
- [ ] Policy whitelist actually restricts a non-whitelisted transfer — demonstrated with real blocked txn attempt
- [ ] Full real cycle executed on mainnet: mint -> investor buy -> income event ingestion (real source) -> attestation -> payout -> redeem
- [ ] Each cycle step evidenced with explorer URL + txn hash in a run log (docs/RUN_LOG.md)
- [ ] Agent signer actually authorized and used for distributions (txn from agent address, not deployer)
- [ ] Gas grant BOT accounted: wrap amount, spent gas, remaining — documented
- [ ] Contracts reachable from frontend via env config on deployed site

## Phase 5 — Submission package
- [ ] GitHub repo pushed (original code, meaningful commit history, no secrets)
- [ ] README: product-first, checklist w/ links, live URLs (contracts, site, sources), honest scope & limitations
- [ ] Repo swept: zero hardcoded addresses, zero mock/sample data files, zero .env committed
- [ ] .gitignore correct (.env, node_modules, .next, keys, build artifacts)
- [ ] LICENSE file
- [ ] Demo video recorded from REAL mainnet session (no cuts of fake state) — evidence: video URL
- [ ] DEMO_SCRIPT.md written (local-only): exact prompts/clicks/narration for Demo Day Aug 24
- [ ] Google Form submission completed before Aug 22 23:59 UTC+8 — evidence: confirmation
- [ ] Optional: applied to ecosystem support program form for post-challenge continuity
- [ ] Optional: content piece (walkthrough) for Content Awards pool

## Phase 6 — Self-audit against judging criteria (tick only with evidence)
- [ ] Product Completion (30%): full loop live on mainnet, every promised action works, no dead buttons
- [ ] Mainnet Integration & Deployment Quality (25%): verified contracts, real txns, BOT-native features used (WBOT wrap, paymaster where live), docs reference chain 677
- [ ] Innovation (20%): claim names the empty lane (no RWA revenue-distribution infra on 677) — evidence: scan search URLs
- [ ] User Experience (15%): demo walkthrough recorded end-to-end; txn feed is the showpiece
- [ ] Technical Quality (10%): tests pass, code reviewed, no secrets, clean deploy logs
- [ ] Track fit: RWA authenticity (real data sources listed) + AI core (attestations on-chain)
- [ ] No overlap with Challenge #1 winners (BOTSpend/SwarmEscrow/DevStation/FlowBridge etc.) — checked and documented
- [ ] No duplicate-submission risk: this project never entered any prior BOT Challenge

## Hard evidence index (keep updating as build proceeds)
- Challenge handbook: https://app.notion.com/p/BOT-Chain-Builder-Challenge-2-3b246f6c38d5803495bac38b8c078690
- Submission form: https://forms.gle/ZKvnfcGrkZmdgigA8
- Gas grant form: https://forms.gle/QGWNnmthCDgL92uR9
- Chain: 677 | RPC https://rpc.botchain.ai | Explorer https://scan.botchain.ai
- WBOT: 0xD5452816194a3784dBa983426cCe7c122F4abd30 | USDT: 0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C
- Paymaster API spec: https://dev-docs.botchain.ai/docs/Developers/eoa-paymaster
- Blockscout API (keyless): https://scan.botchain.ai/api/v2/...
- [ ] All items verified by user before submission
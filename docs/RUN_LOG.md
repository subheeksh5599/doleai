# Run log — every real transaction (evidence for judging)

Evidence = explorer URL + tx hash, never invented. Mainnet (chain 677) is the
live product; testnet (chain 968) was the pre-flight cycle.

## Mainnet (chain 677) — LIVE full cycle (all real, all verified on scan.botchain.ai)

Deployed pool: https://scan.botchain.ai/address/0x688D6d4f3769f219a40009108bC7c2ca4177c6fD
- AssetToken (DOLET): https://scan.botchain.ai/address/0x17a8e184A1D5FecCC4e9728DBCAeB6Cb17d96583 — verified
- PolicyRegistry: https://scan.botchain.ai/address/0x79D4Ce1c7Df6E7C640Db46C17E8a4bE2585EF491 — verified
- AttestationRegistry: https://scan.botchain.ai/address/0xF442320f6d7FEC593Eb472856B89b1Cc2799eB41 — verified
- Payment token: WBOT 0xD5452816194a3784dBa983426cCe7c122F4abd30

| # | Step | Tx hash | Explorer |
|---|---|---|---|
| 1 | Gas-grant distribution: 0.9 BOT → deployer | `0x8170bc119295cfd284d66d1552f7a97f663c34e1d3e513f8e8f39e1d4c99f07f` | [tx](https://scan.botchain.ai/tx/0x8170bc119295cfd284d66d1552f7a97f663c34e1d3e513f8e8f39e1d4c99f07f) |
| 2 | Gas-grant distribution: 0.02 BOT → agent signer | `0x4202c5c95710a2d97d3879579ec4a1eb5b52e34883e05890a2b8277cfb8285f5` | [tx](https://scan.botchain.ai/tx/0x4202c5c95710a2d97d3879579ec4a1eb5b52e34883e05890a2b8277cfb8285f5) |
| 3 | Gas-grant distribution: 0.01 BOT → investor | `0x699b23ef6b6a86e27f1d2bf4bf47432136fb2fecdec83fdbb865655ef929293e` | [tx](https://scan.botchain.ai/tx/0x699b23ef6b6a86e27f1d2bf4bf47432136fb2fecdec83fdbb865655ef929293e) |
| 4 | Deploy Pool + AssetToken + PolicyRegistry + AttestationRegistry | `0xd82e48300034cf5681bde4b19c500135e448605213874c4cfd7dcab0ec2c6588` | [tx](https://scan.botchain.ai/tx/0xd82e48300034cf5681bde4b19c500135e448605213874c4cfd7dcab0ec2c6588) |
| 5 | Wrap 0.75 BOT → WBOT (grant liquidity) | `0x8116641d3f0c3872939abb707264e32adbac1ede08047dad27469f2bb8328b9e` | [tx](https://scan.botchain.ai/tx/0x8116641d3f0c3872939abb707264e32adbac1ede08047dad27469f2bb8328b9e) |
| 6 | Compliance: whitelist issuer (OWNER) | `0x76d9be89ebc4003d90c84cfd0c5738104bef97997a11f9359d689ab84f4a3503` | [tx](https://scan.botchain.ai/tx/0x76d9be89ebc4003d90c84cfd0c5738104bef97997a11f9359d689ab84f4a3503) |
| 7 | Compliance: whitelist investor | `0x47293acdfa99618590384c389cb3d8d21c0137687eea7d741798c89491164719` | [tx](https://scan.botchain.ai/tx/0x47293acdfa99618590384c389cb3d8d21c0137687eea7d741798c89491164719) |
| 8 | Issuer subscribes 0.7 WBOT → 0.7 DOLET | `0x519cb333443ffac66dff1714a58b3bebd565e3244d8326399cd8d9928bae1949` | [tx](https://scan.botchain.ai/tx/0x519cb333443ffac66dff1714a58b3bebd565e3244d8326399cd8d9928bae1949) |
| 9 | Placement: 0.04 WBOT → investor wallet | `0x848da539a41d3368d17dd7e0bd6648b5fcaa8a26d54f79311f47d39c11a66c2c` | [tx](https://scan.botchain.ai/tx/0x848da539a41d3368d17dd7e0bd6648b5fcaa8a26d54f79311f47d39c11a66c2c) |
| 10 | Investor buys 0.04 WBOT → 0.04 DOLET | `0x274bec50468d2bea0aa0f2156ea2404b4988ab7d4b35fdb748757a761271f53b` | [tx](https://scan.botchain.ai/tx/0x274bec50468d2bea0aa0f2156ea2404b4988ab7d4b35fdb748757a761271f53b) |
| 11 | Income inflow 0.001 WBOT (real revenue transfer to pool) | `0x33df8abad33d6374ba6d57afabf9ef66db1d9ada3758b6ade7227eb284ee5c62` | [tx](https://scan.botchain.ai/tx/0x33df8abad33d6374ba6d57afabf9ef66db1d9ada3758b6ade7227eb284ee5c62) |
| 12 | AI agent attestation (cycle 1, 0.001 WBOT, benchmark 2.1614% YoY) — uid `0x6ebcd786...ee01c` | `0x6a10e8e3090466c0d87613f3f19496c9c73b39c2c181cbba95a0e6e5bf81f205` | [tx](https://scan.botchain.ai/tx/0x6a10e8e3090466c0d87613f3f19496c9c73b39c2c181cbba95a0e6e5bf81f205) |
| 13 | AI agent distribution (cycle 1, pro-rata 0.001 WBOT to 2 holders) | `0x73b46efcdf7e508440ce0ffff0528742d789b7d459e5d32b15f9cf217c95f446` | [tx](https://scan.botchain.ai/tx/0x73b46efcdf7e508440ce0ffff0528742d789b7d459e5d32b15f9cf217c95f446) |
| 14 | Investor redemption 0.01 DOLET → 0.01 WBOT | `0xd5a0867b58bb8184d77822693a6a0597e74ee43119f4eb210e7f16c95d73d544` | [tx](https://scan.botchain.ai/tx/0xd5a0867b58bb8184d77822693a6a0597e74ee43119f4eb210e7f16c95d73d544) |

### Browser-triggered cycle #2 (via the dashboard "Run agent cycle" action) — VERIFIED
The site can now trigger a full live cycle from the browser (server-side action, no keys in the bundle):
- Income inflow 0.0005 WBOT (real transfer to pool) | `0xdb2a62db23c58c2153c30cf0607d9366272b02482ce4d879897b3d86bb5ca012` | [tx](https://scan.botchain.ai/tx/0xdb2a62db23c58c2153c30cf0607d9366272b02482ce4d879897b3d86bb5ca012)
- Agent attestation (cycle 2, reuse of deterministic uid `0xd5cfe12f…d15`, benchmark 2.1614%) | `0xa45b8149f8ff40…` | [tx](https://scan.botchain.ai/tx/0xa45b8149f8ff40)
- Distribution (cycle 2, pro-rata 0.0005 WBOT to 2 holders) | `0x05884887b8ab7405821281e35c915e10b56a50cdc0625044040ed5a639a51be5` | [tx](https://scan.botchain.ai/tx/0x05884887b8ab7405821281e35c915e10b56a50cdc0625044040ed5a639a51be5)
- Verified on-chain: distribution #2 gross=0.0005, paid=0.0005, 2 recipients, uid `0xd5cfe12f…`, executor=agent `0x1F6A…` (block 20092345). Pool returned to 0.73 WBOT after distribution.

The cycle route (`/api/cycle`) is stateless: income = paymentBalance − totalSupply (principal), so it survives serverless cold starts and can never distribute principal. Attestation is idempotent (reuses the deterministic uid on AlreadyAttested).

### Fraud-catch demonstration (agent blocked a fake oversized income) — VERIFIED
A real on-chain test that the agent's verification catches overstated/fraudulent income instead of paying it out:

- Fake income: 0.035 WBOT transferred into the pool as if it were revenue | `0x7f2f50fd7199611e8d0172d332cc68ee7c03eba0bae36f2e0e43b86472346cf7` | [tx](https://scan.botchain.ai/tx/0x7f2f50fd7199611e8d0172d332cc68ee7c03eba0bae36f2e0e43b86472346cf7)
- Expected yield for principal 0.73 WBOT at the real World Bank benchmark (2.1614% annual): ~0.000043 WBOT
- Agent's verdict: **DECLINED** — observed ratio 809.667× the expected yield, massively over the 25× band
- On-chain result: **no attestation, no distribution** — the overstated income was blocked. Holders were never overpaid.

This is the product's core anti-fraud property working live: a reported income that does not match the real market benchmark is blocked by the deterministic policy (executor) before any payout. The terminal UI shows this as a red "🛑 Agent BLOCKED the income" state, distinct from a normal approved+distributed cycle.

Cycle-1 verification (agent output, live): benchmark 2.1614% (World Bank WDI US GDP growth, 2025), expected period yield 306,738,589,953,856 wei, observed ratio 3.2601 → **approved (within-band)**, attestation recorded on-chain, distribution executed pro-rata (issuer 0.000946 WBOT, investor 0.000054 WBOT = 0.001 WBOT total).

Gas accounting: 1 BOT grant received → 0.75 wrapped to WBOT (pool liquidity), ~0.15 BOT spent across 14 transactions, remainder in grant wallet.

## Testnet (chain 968) — LIVE cycle (ALL verified on scan.bohr.life)

Deployed pool: https://scan.bohr.life/address/0xd58afbba54c15ef2828f826e480ae63730967937
- AssetToken: https://scan.bohr.life/address/0xdf56a8E4C04142aD4768435C321F2D80AD4736d4 — verified
- PolicyRegistry: https://scan.bohr.life/address/0xEF3e2D055aa65F768D32042E159eFe45B8a76E4f — verified
- AttestationRegistry: https://scan.bohr.life/address/0x57E518058d36e67699C64D559c9940F108dE418b — verified

- Deploy pool | 0xd58afbba... | https://scan.bohr.life/tx/0x5531e732afc9cab09d1e200cc6d3059da94b84682bf2eaf1b7c557e2a3c6e18f
- Wrap 9.5 tBOT -> WBOT | https://scan.bohr.life/tx/0x49528f82486f79756bd843dbb2d6a251604a84e503096ea222520fc236e3a231
- Issuer subscribes 8 WBOT | https://scan.bohr.life/tx/0x1432fdfc52e2b59b0f45372ab9f826ceb93574bc8bab0cc68537d11ffc596d8b
- Income inflow 0.004 WBOT (real transfer to pool) | https://scan.bohr.life/tx/0xc3096960f811a514798f49bc54a80a1df63d83fab5b6155724f79e091e75577d
- Agent attestation (cycle 1, 0.004 WBOT, benchmark 2.161%) | https://scan.bohr.life/tx/0x881bd07b449c2cc8f0ddb6ee69883a9b0f143664f8c2893de3a4912c75267659
- Distribution (cycle 1, prorata payout 0.004 WBOT) | https://scan.bohr.life/tx/0xe09f91571cad19fad35ccfb2b85aa966a64481aba569aa1c1e6e6122bc8e5b43

Ops note: during mainnet bring-up one agent command executed against the testnet
pool instead of mainnet (environment variable shadowing — repo .env exported a
testnet RPC/POOL that dotenv will not override). The result was a harmless
testnet-only buy (https://scan.bohr.life/tx/0xdc6d823df4702725dd174ed48cf94bffb92e09f9e3a29e72292daf7321af91f7)
and the testnet whitelist pair
(0x447080775d18e0af91224ee11e25a50c7d58f63b9a51242b7a1a0e7edc6bc6a1,
0x3d65b79fcf6d758c114b45e30c107224d8229245df65893cc4b28860bf24b315).
Root cause fixed (unset shadowing vars before running the agent); all mainnet
transactions above were executed after the fix and are on chain 677.


### Gasless / EOA Paymaster (Gap 3) — honest verdict: NOT ship-able on mainnet
Verified conclusion, not an assumption:
- The public RPC `https://rpc.botchain.ai` rejects ALL paymaster methods with `-32601 method does not exist`: `pm_isSponsorable`, `pm_prepay`, `pm_payForUserOp`, `eth_paymaster`.
- No public paymaster host resolves (`pm.botchain.ai`, `paymaster.botchain.ai`, `auth-rpc.botchain.ai` all fail/DNS).
- Per the chain's own docs, the EOA Paymaster is part of the paid BOT Chain gateway / Nodereal MegaFuel service (requires a paid API key).
=> A self-hosted gasless sponsor is NOT possible on the free public endpoint. The alternative (EIP-2771 trusted forwarder) would require redeploying the Pool contract to use `_msgSender()` instead of `msg.sender`, which would break the live demo pool and cost the remaining gas. Decision: ship without gasless, and document this constraint honestly in the README — the free tier exposes no sponsor path, so investor actions use standard wallet-signed txns.

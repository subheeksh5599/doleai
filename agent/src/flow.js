import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Contract } from "ethers";
import { config, provider, agentWallet, ownerWallet } from "./config.js";
import { POOL_ABI, ASSET_ABI, ATTESTATION_ABI, ERC20_ABI } from "./abis.js";
import { fetchBenchmark, verify, evidenceHashOf } from "./verifier.js";
import { recordAttestation, executeDistribution } from "./attestation.js";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const STATE_PATH = join(__dirname, "..", config.stateFile);

export function loadState() {
  if (!existsSync(STATE_PATH)) return { lastPoolBalance: "0", lastCycleId: 0, events: [] };
  return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}

export function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function poolContract(signerOrProvider = provider()) {
  return new Contract(config.pool, POOL_ABI, signerOrProvider);
}

export async function onchainSnapshot() {
  const pool = poolContract();
  const asset = new Contract(await pool.assetToken(), ASSET_ABI, provider());
  const reg = new Contract(await pool.attestationRegistry(), ATTESTATION_ABI, provider());
  const [paymentBalance, totalSupply, nextDist, holderCount, agent, owner, paused, attCount] =
    await Promise.all([
      pool.paymentBalance(),
      asset.totalSupply(),
      pool.nextDistId(),
      pool.holderCount(),
      pool.agent(),
      pool.owner(),
      pool.paused(),
      reg.count(),
    ]);
  const holders = [];
  for (let i = 0; i < Number(holderCount); i++) {
    const h = await pool.holders(i);
    const bal = await asset.balanceOf(h);
    if (bal > 0n) holders.push({ address: h, balanceWei: bal.toString() });
  }
  return { paymentBalance, totalSupply, nextDist, holderCount, agent, owner, paused, attCount, holders };
}

export async function runCycle({ dryRun = false } = {}) {
  const state = loadState();
  const snap = await onchainSnapshot();
  const prevBalance = state.lastPoolBalance ? BigInt(state.lastPoolBalance) : null;
  const out = { dryRun };

  // First observation: establish the baseline (never distribute principal).
  if (prevBalance === null || prevBalance === 0n) {
    state.lastPoolBalance = snap.paymentBalance.toString();
    state.lastCycleId = state.lastCycleId || 0;
    saveState(state);
    out.status = "baseline";
    out.message = `Baseline established at ${snap.paymentBalance.toString()} wei. Agent will distribute only income observed after this point.`;
    return out;
  }

  const inflow = snap.paymentBalance - prevBalance;

  if (inflow <= 0n) {
    out.status = "no-inflow";
    out.message = `No new income detected (pool balance ${snap.paymentBalance.toString()} wei, unchanged since last cycle).`;
    return out;
  }

  // 1. Real benchmark (World Bank WDI, keyless).
  const { pct, recordDate } = await fetchBenchmark();
  out.benchmarkRatePct = pct;
  out.benchmarkRecordDate = recordDate;

  // 2. Locate the real funding transaction that caused the inflow (last ERC20
  //    transfer to the pool) — the verifiable evidence for verification.
  let inflowTx = null;
  try {
    inflowTx = await findLastTransferToPool();
  } catch { /* non-fatal */ }
  if (inflowTx) out.inflowTxHash = inflowTx.hash ?? inflowTx;

  // 3. Verify (deterministic band + optional LLM) against real evidence.
  const verdict = await verify({
    inflow,
    inflowTxHash: inflowTx?.hash ?? "unknown",
    principal: snap.totalSupply,
    benchmarkRate: pct,
    benchmarkDate: recordDate,
  });
  out.verdict = verdict;

  const cycleId = state.lastCycleId + 1;
  const evidence = {
    inflowWei: inflow.toString(),
    inflowTxHash: inflowTx?.hash ?? "unknown",
    principalWei: snap.totalSupply.toString(),
    benchmarkRatePct: pct,
    benchmarkRecordDate: recordDate,
    benchmarkNote: "World Bank WDI US GDP growth, latest published year (dataset updated 2026-07-13)",
    accrualPeriodDays: config.cycleDays,
    pool: config.pool,
    chainId: (await provider().getNetwork()).chainId.toString(),
    verdictRequestedBy: "AttestPay verification policy",
    verdict,
  };
  const evidenceHash = evidenceHashOf(evidence);
  const sourceRef = `benchmark:${recordDate}|tx:${inflowTx?.hash ?? "unknown"}`;

  if (!verdict.approve) {
    out.status = "declined";
    out.message = `Inflow declined by verification (${verdict.reason}). No distribution executed.`;
    saveState({ ...state, lastCycleId: cycleId });
    return out;
  }

  if (dryRun) {
    out.status = "ready";
    out.cycleId = cycleId;
    out.evidenceHash = evidenceHash;
    out.nextAction = `record + distribute ${inflow.toString()} wei for cycle ${cycleId}`;
    return out;
  }

  // 3. Record on-chain attestation (agent key), then distribute — the agent
  //     sequence owns the nonce stream in this process, so use a manual
  //     counter (auto-nonce can stale-loop across back-to-back sends).
  let agentNonce = await provider().getTransactionCount(agentWallet().address, "pending");
  const recorded = await recordAttestation({ cycleId, grossAmount: inflow, evidenceHash, sourceRef, nonce: agentNonce++ });
  out.attestationTxHash = recorded.txHash;
  out.attestationBlock = recorded.blockNumber;
  out.attestationUid = recorded.uid;

  // 4. Execute prorata distribution (agent key, requires attestation on-chain).
  const dist = await executeDistribution({ grossAmount: inflow, cycleId, attestationUid: recorded.uid, nonce: agentNonce++ });
  out.distributionTxHash = dist.txHash;
  out.distributionBlock = dist.blockNumber;
  out.status = "distributed";

  state.lastPoolBalance = snap.paymentBalance.toString();
  state.lastCycleId = cycleId;
  state.events = [...(state.events || []), {
    cycleId,
    inflowWei: inflow.toString(),
    attestationTx: recorded.txHash,
    distributionTx: dist.txHash,
    at: new Date().toISOString(),
  }].slice(-20);
  saveState(state);
  return out;
}

// Finds the most recent ERC20 Transfer event delivering value to the pool
// (the real "income" event) using the chain's websocket/HTTP logs. Falls back
// to null when the RPC disables eth_getLogs (official BOT mainnet endpoint).
async function findLastTransferToPool() {
  const token = new Contract(config.paymentToken, ERC20_ABI, provider());
  const latest = await provider().getBlockNumber();
  const fromBlock = Math.max(0, latest - 500);
  const filter = token.filters.Transfer(null, config.pool);
  const logs = await provider().getLogs({ ...filter, fromBlock, toBlock: latest });
  if (!logs.length) return null;
  const last = logs[logs.length - 1];
  return { hash: last.transactionHash, blockNumber: last.blockNumber, logIndex: last.index };
}

export async function onboard(accounts, { cap = 0n } = {}) {
  const wallet = ownerWallet();
  const pool = poolContract(wallet);
  // Single-process ownership of this wallet: seed a fresh per-process counter
  // from the chain ("pending" sees the latest nonce) and increment manually —
  // auto-nonce caching can stale-loop when the same key deploys first.
  let nonce = await provider().getTransactionCount(wallet.address, "pending");
  const results = [];
  for (const addr of accounts) {
    const tx = await pool.setWhitelisted(addr, true, { nonce: nonce++ });
    const r = await tx.wait();
    if (cap > 0n) {
      const tx2 = await pool.setHolderCap(addr, cap, { nonce: nonce++ });
      await tx2.wait();
    }
    results.push({ address: addr, whitelistTx: r.hash, cap: cap.toString() });
  }
  return results;
}

export async function fundPool(amountWei, from) {
  const wallet = new Wallet(from, provider());
  const token = new Contract(config.paymentToken, ERC20_ABI, wallet);
  const tx = await token.transfer(config.pool, amountWei);
  const r = await tx.wait();
  return { txHash: r.hash, blockNumber: r.blockNumber, amountWei: amountWei.toString() };
}

export const WRAP_ABI = [
  "function deposit() payable",
  "function withdraw(uint256)",
  "function balanceOf(address) view returns (uint256)"
];

export async function wrapBOT(amountWei) {
  // WBOT is wrapped BOT (WETH9-style). Deposit native BOT, receive WBOT.
  const wallet = agentWallet();
  const wbot = new Contract(config.paymentToken, WRAP_ABI, wallet);
  const tx = await wbot.deposit({ value: amountWei });
  const r = await tx.wait();
  return { txHash: r.hash, blockNumber: r.blockNumber, wrappedWei: amountWei.toString() };
}
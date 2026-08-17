import { config, provider } from "./config.js";

/**
 * Real-world verification inputs:
 *  - Inflow: real on-chain WBOT transfer into the pool (tx hash verified against RPC).
 *  - Benchmark: real US Treasury marketable-bill rate from fiscaldata.treasury.gov (keyless).
 *  - Principal: real on-chain asset-token supply (total deposited WBOT).
 *
 * Decision logic is transparent and deterministic; when an LLM endpoint is
 * configured it additionally evaluates the full evidence object and returns
 * a structured verdict. Both paths produce the same schema.
 */

export async function fetchBenchmark() {
  const res = await fetch(config.benchmarkUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Benchmark API HTTP ${res.status}`);
  const data = await res.json();
  const row = data?.[1]?.[0];
  if (!row) throw new Error("Benchmark API returned no rows");
  const pct = parseFloat(row.value);
  if (!Number.isFinite(pct)) throw new Error(`Benchmark missing value for ${row.date}`);
  return { pct, recordDate: row.date, raw: row };
}

export function expectedDailyRate(pctAnnual) {
  return pctAnnual / 100 / 365 * config.cycleDays;
}

export function decisionFromNumbers({ inflow, principal, ratePct, context }) {
  if (principal <= 0n) return { approve: false, reason: "no-principal", confidence: 1.0 };
  const expected = (Number(principal) / 1e18) * expectedDailyRate(ratePct);
  const actual = Number(inflow) / 1e18;
  const ratio = expected > 0 ? actual / expected : 0;
  if (ratio < config.minRatio) return { approve: false, reason: "below-band", confidence: 0.95 };
  if (ratio > config.maxRatio) return { approve: false, reason: "above-band", confidence: 0.95 };
  const anomalyNotes = [];
  if (ratio > config.maxRatio / 2) anomalyNotes.push("inflow-high");
  if (anomalyNotes.length) return { approve: true, reason: "within-band-with-flag", confidence: 0.8, notes: anomalyNotes };
  return { approve: true, reason: "within-band", confidence: 0.9, notes: [] };
}

export async function verifyWithLLM(evidence) {
  const { baseUrl, key, model } = config.llm;
  if (!key) return null;
  const sys = `You are the verification core of an on-chain revenue-distribution agent (AttestPay on BOT Chain).
Task: review the real income evidence and return ONLY a JSON object:
{"approve": boolean, "reason": "approved|flagged|declined", "confidence": 0..1, "notes": [string...]}
Rules: approve when the inflow is plausibly explained by the benchmark yield band and evidence integrity. Decline on anomaly (inflow far outside band, evidence hash mismatch, stale benchmark). Never invent numbers. Use only the evidence provided.`;
  const body = {
    model,
    messages: [{ role: "system", content: sys }, { role: "user", content: JSON.stringify(evidence, null, 2) }],
    temperature: 0,
    response_format: { type: "json_object" },
  };
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

export async function verify({ inflow, inflowTxHash, principal, benchmarkRate, benchmarkDate }) {
  const evidence = {
    inflowWei: inflow.toString(),
    inflowTxHash,
    principalWei: principal.toString(),
    benchmarkRatePct: benchmarkRate,
    benchmarkRecordDate: benchmarkDate,
    pool: config.pool,
    chainId: (await provider().getNetwork()).chainId.toString(),
  };
  const numeric = decisionFromNumbers({ inflow, principal, ratePct: benchmarkRate, context: evidence });
  let llm = null;
  try {
    llm = await verifyWithLLM(evidence);
  } catch (e) {
    llm = { approve: true, reason: "llm-unavailable-fallback", confidence: 0.5, notes: [String(e.message || e)] };
  }
  const verdict = {
    approve: llm ? Boolean(llm.approve) : numeric.approve,
    reason: llm ? (llm.reason || "approved") : numeric.reason,
    confidence: llm ? Number(llm.confidence ?? 0.5) : numeric.confidence,
    notes: (llm ? llm.notes : numeric.notes) || [],
    engine: llm ? "llm" : "deterministic",
  };
  // Safety: the deterministic band check is the floor — an out-of-band inflow
  // is NEVER approved even if the LLM says yes.
  if (!numeric.approve && verdict.approve) {
    return { ...verdict, approve: false, reason: "overridden-by-band-check", engine: "deterministic" };
  }
  return verdict;
}

export function evidenceHashOf(evidenceJson) {
  const { keccak256, toUtf8Bytes } = ethersModule;
  return keccak256(toUtf8Bytes(JSON.stringify(evidenceJson)));
}

import { keccak256, toUtf8Bytes } from "ethers";
const ethersModule = { keccak256, toUtf8Bytes };
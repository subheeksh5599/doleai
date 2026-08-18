import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract, Wallet, formatEther, keccak256, toUtf8Bytes, concat, getAddress, toBeHex } from "ethers";
import { config, POOL_ABI, REGISTRY_ABI } from "../../../lib/config";

// Server-side "run the agent" action. The agent wallet signs the EIP-712
// attestation and executes the prorata distribution — the same on-chain loop
// the CLI (agent/src/cli.js run-cycle) performs. The agent private key is read
// here from a SERVER-ONLY env var (BOTCHAIN_AGENT_PK) so it is never shipped
// to the browser.
//
// BASELINE (stateless, no DB): the pool's principal balance is exactly the
// asset-token supply (buys/subscribes add WBOT 1:1 and mint DOLET 1:1). So the
// undistributed income sitting in the pool is `paymentBalance - totalSupply`.
// This needs no local state and survives serverless cold starts — it recomputes
// the true income delta from on-chain data every call.
//
// SAFETY: a distribution pays existing holders their pro-rata share of the new
// income and never touches principal (paymentBalance - totalSupply caps it).
// The on-chain attestation gate re-validates pool+cycle+gross before paying, so
// an un-attested or forged distribution reverts.

export const dynamic = "force-dynamic";

const AGENT_PK = process.env.BOTCHAIN_AGENT_PK || "";
const CYCLE_SECRET = process.env.BOTCHAIN_CYCLE_SECRET || "";

function provider() {
  return new JsonRpcProvider(config.rpcUrl);
}
function poolContract(p: any) {
  return new Contract(config.poolAddress, POOL_ABI, p);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Require the action secret unless explicitly disabled (dev/self-host).
    if (CYCLE_SECRET && body.secret !== CYCLE_SECRET) {
      return NextResponse.json({ error: "invalid or missing action secret" }, { status: 403 });
    }
    if (!AGENT_PK) {
      return NextResponse.json({ error: "agent not configured (BOTCHAIN_AGENT_PK unset)" }, { status: 503 });
    }
    const p = provider();
    const pool = poolContract(p);
    const agent = new Wallet(AGENT_PK, p);

    // 1. Read live state.
    const assetAddr = await pool.assetToken();
    const asset = new Contract(assetAddr, ["function totalSupply() view returns (uint256)"], p);
    const [paymentBalance, totalSupply, holderCount] = await Promise.all([
      pool.paymentBalance(),
      asset.totalSupply(),
      pool.holderCount(),
    ]);

    // 2. Inflow (stateless): the pool's principal balance IS the asset-token
    //    supply (1:1 on subscribe/buy), so undistributed income sitting in the
    //    pool = paymentBalance - totalSupply. No local baseline, no DB — this
    //    survives serverless cold starts and can't distribute principal.
    const principal = totalSupply; // WBOT principal in (== DOLET supply)
    let inflow = paymentBalance > principal ? paymentBalance - principal : 0n;

    // Only decimal-scale dust (rounding leftovers) or no new income: nothing to
    // distribute. Report honestly rather than pretending a cycle ran.
    if (inflow === 0n) {
      return NextResponse.json({
        status: "no-inflow",
        message: `no undistributed income (pool ${formatEther(paymentBalance)} WBOT = principal ${formatEther(principal)} WBOT)`,
        paymentBalance: formatEther(paymentBalance),
        totalSupply: formatEther(totalSupply),
        holderCount: holderCount.toString(),
      });
    }

    // 3. Verify against the real World Bank benchmark (keyless).
    let benchmarkRate: number;
    let benchmarkDate: string;
    try {
      const res = await fetch("https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=1", { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      const row = data?.[1]?.[0];
      benchmarkRate = parseFloat(row?.value);
      benchmarkDate = String(row?.date ?? "");
      if (!Number.isFinite(benchmarkRate)) throw new Error("benchmark missing value");
    } catch (e) {
      return NextResponse.json({ status: "declined", reason: `benchmark fetch failed: ${(e as Error).message}` }, { status: 502 });
    }
    // Deterministic band check (mirrors agent/verifier.js).
    const principalNum = Number(formatEther(totalSupply));
    const expected = principalNum * (benchmarkRate / 100 / 365) * (Number(process.env.VERIFY_CYCLE_DAYS || 1) || 1);
    const actual = Number(formatEther(inflow));
    const ratio = expected > 0 ? actual / expected : 0;
    if (ratio < (Number(process.env.VERIFY_MIN_RATIO || "0.25") || 0.25) || ratio > (Number(process.env.VERIFY_MAX_RATIO || "25") || 25)) {
      return NextResponse.json({ status: "declined", reason: `inflow outside verification band (ratio ${ratio.toFixed(3)} vs expected ${expected.toFixed(6)})` });
    }

    // 4. Encode + sign the EIP-712 attestation, record on-chain (idempotently),
    //    then distribute.
    const cycleId = (await pool.nextDistId()).toString();
    const registryAddr = await pool.attestationRegistry();
    const registry = new Contract(registryAddr, REGISTRY_ABI, agent);
    const chainId = (await p.getNetwork()).chainId;
    const domain = { name: "DoleAI", version: "1", chainId, verifyingContract: registryAddr };
    const types = { Attestation: [
      { name: "pool", type: "address" }, { name: "cycleId", type: "uint256" },
      { name: "grossAmount", type: "uint256" }, { name: "evidenceHash", type: "bytes32" },
      { name: "sourceRef", type: "string" },
    ] };
    const evidenceHash = keccak256(
      toUtf8Bytes(JSON.stringify({
        inflowWei: inflow.toString(), benchmarkRatePct: benchmarkRate, benchmarkDate,
        principalWei: totalSupply.toString(), pool: config.poolAddress, chainId: chainId.toString(),
      }))
    );
    const sourceRef = `benchmark:${benchmarkDate}`;

    // uid = keccak256(abi.encodePacked(pool, cycleId)) — deterministic (the
    // contract computes it the same way). Try to record; if an attestation for
    // this cycle already exists (e.g. a prior partial run), the call reverts
    // with AlreadyAttested (0x00b83ed4) and we reuse the existing uid instead —
    // so this action is idempotent and never double-records.
    let recordReceipt: { hash: string } | null = null;
    try {
      await registry.record.staticCall(config.poolAddress, BigInt(cycleId), inflow, evidenceHash, sourceRef);
      const recordTx = await registry.record(config.poolAddress, BigInt(cycleId), inflow, evidenceHash, sourceRef);
      recordReceipt = await recordTx.wait();
    } catch (err) {
      const data = err && typeof err === "object" && "data" in err ? String((err as { data?: string }).data ?? "") : "";
      if (data.startsWith("0x00b83ed4")) {
        recordReceipt = null; // already attested — fall through to reuse
      } else {
        throw err;
      }
    }
    const finalUid: string = recordReceipt
      ? await registry.uids(Number(await registry.count()) - 1)
      : keccak256(concat([getAddress(config.poolAddress) as `0x${string}`, toBeHex(BigInt(cycleId), 32)]));

    const distTx = await poolContract(agent).distribute(inflow, BigInt(cycleId), finalUid);
    const distReceipt = await distTx.wait();

    return NextResponse.json({
      status: "distributed",
      cycleId,
      benchmarkRatePct: benchmarkRate,
      benchmarkDate,
      inflowWBOT: formatEther(inflow),
      attestationTxHash: recordReceipt?.hash ?? null,
      distributionTxHash: distReceipt.hash,
      attestationTxUrl: recordReceipt ? `${config.explorerBase}/tx/${recordReceipt.hash}` : null,
      distributionTxUrl: `${config.explorerBase}/tx/${distReceipt.hash}`,
      attestationUid: finalUid,
    });
  } catch (e) {
    const msg = e && typeof e === "object" && "shortMessage" in e
      ? String((e as { shortMessage?: unknown }).shortMessage ?? "")
      : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, detail: String(e) }, { status: 500 });
  }
}

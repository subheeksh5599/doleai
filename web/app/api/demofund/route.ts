import { NextResponse } from "next/server";
import { JsonRpcProvider, Contract, Wallet, parseEther, formatEther } from "ethers";
import { config, POOL_ABI, ERC20_ABI } from "../../../lib/config";

// Demo funding route. Sends a small fixed WBOT amount from the owner wallet to
// a freshly-connected address so a demo investor can buy shares without first
// wrapping BOT. SAFETY:
//  - Owner key is SERVER-ONLY (BOTCHAIN_OWNER_PK), never shipped.
//  - Gated by an env flag (BOTCHAIN_DEMO_FUND=1) so it is off by default.
//  - Capped amount, of course — non-NEXT_PUBLIC env BOTCHAIN_DEMO_AMOUNT (WBOT).
//  - Only funds addresses already whitelisted in the policy registry, and only
//    when the target is not the pool itself / not zero.
//  - Rate-limit guard keyed on the target address (best-effort, per-process).
export const dynamic = "force-dynamic";

const OWNER_PK = process.env.BOTCHAIN_OWNER_PK || "";
const DEMO_ENABLED = process.env.BOTCHAIN_DEMO_FUND === "1";
const DEMO_AMOUNT = process.env.BOTCHAIN_DEMO_AMOUNT || "1"; // WBOT
const MAX_AMOUNT = parseEther("1"); // hard safety cap regardless of env

const funded: Record<string, number> = {};

function provider() {
  return new JsonRpcProvider(config.rpcUrl);
}

export async function POST(req: Request) {
  try {
    if (!DEMO_ENABLED) {
      return NextResponse.json({ error: "demo funding disabled (BOTCHAIN_DEMO_FUND != 1)" }, { status: 403 });
    }
    if (!OWNER_PK) {
      return NextResponse.json({ error: "owner not configured (BOTCHAIN_OWNER_PK unset)" }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    const target = String(body.address || "");
    if (!/^0x[0-9a-fA-F]{40}$/.test(target)) {
      return NextResponse.json({ error: "invalid target address" }, { status: 400 });
    }
    const lower = target.toLowerCase();
    if (lower === config.poolAddress.toLowerCase() || lower === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "invalid target" }, { status: 400 });
    }
    // one-time per address per process (demo)
    if (funded[lower]) {
      return NextResponse.json({ error: "address already funded in this session" }, { status: 429 });
    }

    const p = provider();
    const owner = new Wallet(OWNER_PK, p);
    const token = new Contract(config.paymentToken, ERC20_ABI, owner);
    const pool = new Contract(config.poolAddress, POOL_ABI, p);
    const policyAddr = await pool.policyRegistry();
    const policy = new Contract(policyAddr, ["function whitelisted(address) view returns (bool)"], p);
    const whitelisted = await policy.whitelisted(target);
    if (!whitelisted) {
      return NextResponse.json({ error: "target is not whitelisted by policy" }, { status: 403 });
    }

    let amount: bigint;
    try {
      amount = parseEther(DEMO_AMOUNT);
    } catch {
      amount = parseEther("1");
    }
    if (amount > MAX_AMOUNT) amount = MAX_AMOUNT;

    const tx = await token.transfer(target, amount);
    const receipt = await tx.wait();
    funded[lower] = 1;

    return NextResponse.json({
      ok: true,
      amountWBOT: formatEther(amount),
      to: target,
      txHash: receipt.hash,
      txUrl: `${config.explorerBase}/tx/${receipt.hash}`,
    });
  } catch (e) {
    const msg = e && typeof e === "object" && "shortMessage" in e
      ? String((e as { shortMessage?: unknown }).shortMessage ?? "")
      : e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

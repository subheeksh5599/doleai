import { NextResponse } from "next/server";
import { fetchRecentByAddresses } from "../../../lib/explorer";
import { getPoolState } from "../../../lib/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getPoolState();
    const addresses = [state.poolAddress, state.agent];
    // Resolve registry + asset addresses via chain calls.
    const { registry, asset } = await import("../../../lib/chain");
    addresses.push(await registry().then((r) => r.target as string));
    addresses.push(await asset().then((a) => a.target as string));
    const rows = await fetchRecentByAddresses([...new Set(addresses.filter(Boolean))]);
    return NextResponse.json({ rows, asOf: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
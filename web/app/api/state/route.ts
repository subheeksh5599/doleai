import { NextResponse } from "next/server";
import { getPoolState } from "../../../lib/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getPoolState();
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
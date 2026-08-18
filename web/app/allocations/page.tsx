"use client";

import { useMemo } from "react";
import { useDoleai, SHORT, type Holder } from "@/lib/useDoleai";
import { config } from "@/lib/config";
import { useWallet } from "@/components/Header";

// Allocations → participation. Mirrors the reference's "sizing" intent: how the
// pool is weighted, who's due what, and the per-holder compliance limits. Real
// on-chain holders + caps, no simulation.

export default function AllocationsPage() {
  const { state, loading } = useDoleai();
  const { account, ready, connect, connected, disconnect } = useWallet();

  const totalSupply = parseFloat(state?.totalSupply ?? "0") || 1;

  const rows = useMemo(() => {
    const holders: Holder[] = state?.holders ?? [];
    return [...holders]
      .map((h) => {
        const bal = parseFloat(h.balance) || 0;
        return { ...h, bal, weight: (bal / totalSupply) * 100 };
      })
      .sort((a, b) => b.bal - a.bal);
  }, [state, totalSupply]);

  // a connected holder's own slice
  const me = account ? rows.find((r) => r.address.toLowerCase() === account.toLowerCase()) : null;

  return (
    <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
      <div className="label" style={{ marginBottom: 10 }}>
        {"// pool structure · who holds / who's due"}
      </div>
      <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", maxWidth: "20ch" }}>
        Weight, not whispers.
      </h2>
      <p style={{ marginTop: 14, maxWidth: "60ch", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
        Every share maps to a weight, and every weight maps to a pro-rata slice of attested income. Caps are on-chain compliance limits, not marketing.
      </p>

      {/* account strip */}
      <div className="panel scan" style={{ marginTop: 28, padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span className="label" style={{ color: "var(--ink)" }}>
          {ready && connected && account ? `wallet · ${account.slice(0, 6)}…${account.slice(-4)}` : "no wallet connected"}
        </span>
        {me && (
          <span className="label" style={{ color: "var(--gain)" }}>
            your weight · {me.weight.toFixed(4)}%
          </span>
        )}
        <div style={{ marginLeft: "auto" }}>
          {!ready || !connected ? (
            <button className="act" onClick={() => void connect()}>Connect</button>
          ) : (
            <button className="act" onClick={disconnect} style={{ color: "var(--loss)" }}>Sign out</button>
          )}
        </div>
      </div>

      {/* header stat strip */}
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          background: "var(--line)",
          border: "1px solid var(--line)",
        }}
      >
        {[
          ["shares out", loading ? "…" : state?.totalSupply ?? "—"],
          ["holders", loading ? "…" : state?.holderCount ?? "—"],
          ["total weight", "100.00%"],
          ["agent", loading ? "…" : state ? SHORT(state.agent) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="scan" style={{ background: "var(--bg)", padding: "16px 20px" }}>
            <div className="label" style={{ marginBottom: 6 }}>{k}</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* weighting table */}
      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ marginBottom: 12 }}>
          {"// share distribution · weighted"}
        </div>
        <div className="panel scan" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  {["#", "holder", "shares", "weight", "status", "cap"].map((h) => (
                    <th key={h} className="label" style={{ padding: "12px 16px", color: "var(--faint)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!state && (
                  <tr>
                    <td colSpan={6} className="tnum" style={{ padding: "24px 16px", color: "var(--faint)", fontSize: 12 }}>loading…</td>
                  </tr>
                )}
                {rows.map((r, i) => {
                  const mine = me && r.address.toLowerCase() === me.address.toLowerCase();
                  return (
                    <tr key={r.address} className="wl-row" style={{ borderBottom: "1px solid var(--line)", background: mine ? "var(--surface-2)" : undefined }}>
                      <td className="pixel" style={{ padding: "12px 16px", fontSize: 14, color: i < 3 ? "var(--signal)" : "var(--faint)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <a className="link" href={`/k/${r.address}`} style={{ fontSize: 12 }}>
                          {SHORT(r.address)}{mine ? " · you" : ""}
                        </a>
                      </td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink)" }}>{r.balance}</td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink)" }}>{r.weight.toFixed(4)}%</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="chip" style={{ color: r.whitelisted ? "var(--gain)" : "var(--loss)", borderColor: r.whitelisted ? "color-mix(in oklch, var(--gain) 45%, var(--line))" : "color-mix(in oklch, var(--loss) 45%, var(--line))" }}>
                          {r.whitelisted ? "whitelisted" : "blocked"}
                        </span>
                      </td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>{r.cap ? `≤ ${r.cap}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span className="label">weights computed live from on-chain balances · chain {config.chainId}</span>
        <span className="label">
          <a className="link" href={config.explorerBase} target="_blank" rel="noreferrer">explorer ↗</a>
        </span>
      </footer>
    </main>
  );
}

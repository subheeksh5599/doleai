"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDoleai, fmtTime, SHORT } from "@/lib/useDoleai";
import { config } from "@/lib/config";

// Holder dossier — the detail view for a single participant. Shows their live
// on-chain position, compliance status, and what they were paid per cycle.

export default function HolderDossierPage() {
  const params = useParams<{ addr: string }>();
  const addr = params?.addr ?? "";
  const { state, loading, err } = useDoleai();

  const holder = useMemo(
    () =>
      (state?.holders ?? []).find(
        (h) => h.address.toLowerCase() === (addr || "").toLowerCase(),
      ),
    [state, addr],
  );

  const totalSupply = parseFloat(state?.totalSupply ?? "0") || 1;
  const weight = holder ? (parseFloat(holder.balance) / totalSupply) * 100 : 0;

  const contributions = useMemo(
    () =>
      (state?.distributions ?? [])
        .map((d) => {
          const gross = parseFloat(d.grossAmount) || 0;
          const due = holder ? (gross * parseFloat(holder.balance)) / totalSupply : 0;
          return { ...d, due };
        })
        .filter((d) => d.recipientCount > 0),
    [state, holder, totalSupply],
  );

  const addrHref = (a: string) => `${config.explorerBase}/address/${a}`;

  if (loading && !state) {
    return (
      <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
        <div className="label" style={{ color: "var(--faint)" }}>loading dossier…</div>
      </main>
    );
  }

  if (!holder) {
    return (
      <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
        <div className="label" style={{ marginBottom: 10 }}>{"// holder dossier"}</div>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)" }}>Not a holder.</h2>
        <p style={{ marginTop: 14, maxWidth: "52ch", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
          {SHORT(addr)} has no on-chain shares in this pool{err ? ` (${err})` : ""}.
        </p>
        <Link href="/allocations" className="link" style={{ display: "inline-block", marginTop: 22, fontSize: 13 }}>
          ← back to allocations
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
      <div className="label" style={{ marginBottom: 10 }}>
        {"// holder dossier"}
      </div>

      {/* identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span className="dossier-avatar pixel" style={{ color: "var(--ink)" }}>
          {SHORT(holder.address).slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)" }}>{SHORT(holder.address)}</h2>
          <span className="label" style={{ color: "var(--faint)" }}>
            <a className="link" href={addrHref(holder.address)} target="_blank" rel="noreferrer">{holder.address} ↗</a>
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="chip" style={{ color: holder.whitelisted ? "var(--gain)" : "var(--loss)", borderColor: holder.whitelisted ? "color-mix(in oklch, var(--gain) 45%, var(--line))" : "color-mix(in oklch, var(--loss) 45%, var(--line))" }}>
            {holder.whitelisted ? "whitelisted" : "blocked"}
          </span>
        </div>
      </div>

      {/* position stats */}
      <div
        style={{
          marginTop: 32,
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          background: "var(--line)",
          border: "1px solid var(--line)",
        }}
      >
        {[
          ["shares", holder.balance],
          ["weight", `${weight.toFixed(4)}%`],
          ["cap", holder.cap ? `≤ ${holder.cap}` : "—"],
          ["distributions", String(contributions.length)],
        ].map(([k, v]) => (
          <div key={k} className="scan" style={{ background: "var(--bg)", padding: "16px 20px" }}>
            <div className="label" style={{ marginBottom: 6 }}>{k}</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* payout history */}
      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ marginBottom: 12 }}>
          {"// pro-rata due per distribution"}
        </div>
        <div className="panel scan" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  {["#", "cycle", "gross", "this holder (pro-rata)", "receivers", "time (UTC)"].map((h) => (
                    <th key={h} className="label" style={{ padding: "12px 16px", color: "var(--faint)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contributions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="tnum" style={{ padding: "24px 16px", color: "var(--faint)", fontSize: 12 }}>
                      no distributions recorded yet
                    </td>
                  </tr>
                )}
                {contributions.map((d) => (
                  <tr key={d.id} className="wl-row" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.id}</td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.cycleId}</td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.grossAmount}</td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--gain)" }}>{d.due.toFixed(6)}</td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>{d.recipientCount}</td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 11, color: "var(--faint)" }}>{fmtTime(d.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Link href="/allocations" className="link" style={{ display: "inline-block", marginTop: 28, fontSize: 13 }}>
        ← back to allocations
      </Link>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useDoleai, fmtTime, SHORT } from "@/lib/useDoleai";
import { config } from "@/lib/config";

type Sort = "balance" | "alpha";

export default function LeaderboardPage() {
  const { state, txns, err, loading } = useDoleai();
  const [sort, setSort] = useState<Sort>("balance");
  const [query, setQuery] = useState("");

  const addrHref = (a: string) => `${config.explorerBase}/address/${a}`;

  const ranked = useMemo(() => {
    const holders = state?.holders ?? [];
    let rows = [...holders];
    if (sort === "balance") rows.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
    else rows.sort((a, b) => a.address.localeCompare(b.address));
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((h) => h.address.toLowerCase().includes(q));
    return rows;
  }, [state, sort, query]);

  return (
    <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
      <div className="label" style={{ marginBottom: 10 }}>
        {"// live attestation feed"}
      </div>
      <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", maxWidth: "20ch" }}>
        The record, as it happens.
      </h2>
      <p style={{ marginTop: 14, maxWidth: "60ch", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
        Every transaction, distribution, and agent attestation touching the DoleAI contracts on BOT Chain — live reads, nothing simulated. Each row opens in the explorer.
      </p>

      {err && (
        <div className="panel" style={{ marginTop: 22, padding: "12px 16px", borderColor: "var(--loss)" }}>
          <span className="label" style={{ color: "var(--loss)" }}>
            ⚠ {err}
          </span>
        </div>
      )}

      {/* stat strip */}
      <div
        style={{
          marginTop: 32,
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          background: "var(--line)",
          border: "1px solid var(--line)",
        }}
      >
        {[
          ["pool reserves", state ? `${state.paymentBalance} ${state.token.symbol}` : "—"],
          ["shares out", state ? state.totalSupply : "—"],
          ["holders", state ? String(state.holderCount) : "—"],
          ["distributions", state ? String(state.distributions.length) : "—"],
          ["attestations", state ? String(state.attestations.length) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="scan" style={{ background: "var(--bg)", padding: "18px 20px" }}>
            <div className="label" style={{ marginBottom: 8 }}>
              {k}
            </div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
              {loading && !state ? "…" : v}
            </div>
          </div>
        ))}
      </div>

      {/* live transactions */}
      <section style={{ marginTop: 44 }}>
        <div className="label" style={{ marginBottom: 12 }}>
          {"// live chain activity"}
        </div>
        <div className="panel scan" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  {["txn", "age", "from", "to", "action"].map((h) => (
                    <th key={h} className="label" style={{ padding: "12px 16px", color: "var(--faint)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="tnum" style={{ padding: "28px 16px", color: "var(--faint)", fontSize: 12, textAlign: "center" }}>
                      awaiting first transactions on {config.explorerBase}…
                    </td>
                  </tr>
                )}
                {txns.map((t) => (
                  <tr key={t.hash} className="wl-row" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <a className="link" href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--signal)" }}>
                        {SHORT(t.hash)}↗
                      </a>
                    </td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                      {t.timestamp ? new Date(t.timestamp).toISOString().replace("T", " ").slice(5, 19) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {t.from ? (
                        <a className="link" href={addrHref(t.from)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          {SHORT(t.from)}
                        </a>
                      ) : (
                        <span className="tnum" style={{ fontSize: 12, color: "var(--faint)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {t.to ? (
                        <a className="link" href={addrHref(t.to)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          {SHORT(t.to)}
                        </a>
                      ) : (
                        <span className="tnum" style={{ fontSize: 12, color: "var(--faint)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="label" style={{ color: "var(--muted)" }}>{t.method || "transfer"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", marginTop: 44 }}>
        {/* attestations */}
        <section>
          <div className="label" style={{ marginBottom: 12 }}>
            {"// agent attestations"}
          </div>
          <div className="panel scan" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    {["cycle", "gross", "signer", "block"].map((h) => (
                      <th key={h} className="label" style={{ padding: "10px 14px", color: "var(--faint)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!state && (
                    <tr>
                      <td colSpan={4} className="tnum" style={{ padding: "20px 14px", color: "var(--faint)", fontSize: 12 }}>
                        loading…
                      </td>
                    </tr>
                  )}
                  {state?.attestations.map((a) => (
                    <tr key={a.uid} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12 }}>{a.cycleId}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12, color: "var(--gain)" }}>{a.grossAmount}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <a className="link" href={addrHref(a.signer)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          {SHORT(a.signer)}
                        </a>
                      </td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted)" }}>{a.blockNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* distributions */}
        <section>
          <div className="label" style={{ marginBottom: 12 }}>
            {"// distributions"}
          </div>
          <div className="panel scan" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                    {["#", "cycle", "gross", "paid", "n", "time (UTC)"].map((h) => (
                      <th key={h} className="label" style={{ padding: "10px 14px", color: "var(--faint)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!state && (
                    <tr>
                      <td colSpan={6} className="tnum" style={{ padding: "20px 14px", color: "var(--faint)", fontSize: 12 }}>
                        loading…
                      </td>
                    </tr>
                  )}
                  {state?.distributions.map((d) => (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12 }}>{d.id}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12 }}>{d.cycleId}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12 }}>{d.grossAmount}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12, color: "var(--gain)" }}>{d.totalPaid}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted)" }}>{d.recipientCount}</td>
                      <td className="tnum" style={{ padding: "10px 14px", fontSize: 11, color: "var(--faint)" }}>{fmtTime(d.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* holders leaderboard */}
      <section style={{ marginTop: 44 }}>
        <div className="label" style={{ marginBottom: 12 }}>
          {"// holders · ranked"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <div className="term-search" style={{ flex: "1 1 220px" }}>
            <span className="label" style={{ color: "var(--faint)" }}>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search address…" />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["balance", "by balance"],
                ["alpha", "a–z"],
              ] as [Sort, string][]
            ).map(([k, label]) => (
              <button key={k} className={`filter-pill ${sort === k ? "filter-on" : ""}`} style={{ fontSize: 11, padding: "7px 11px" }} onClick={() => setSort(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel scan" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  {["#", "holder", "shares", "status"].map((h) => (
                    <th key={h} className="label" style={{ padding: "12px 16px", color: "var(--faint)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!state && (
                  <tr>
                    <td colSpan={4} className="tnum" style={{ padding: "24px 16px", color: "var(--faint)", fontSize: 12 }}>
                      loading…
                    </td>
                  </tr>
                )}
                {ranked.map((h, i) => (
                  <tr key={h.address} className="wl-row" style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="pixel" style={{ padding: "12px 16px", fontSize: 15, color: i < 3 ? "var(--signal)" : "var(--faint)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <a href={`/k/${h.address}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <span className="mini-avatar pixel" style={{ fontSize: 10 }}>{SHORT(h.address).slice(0, 2).toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: "var(--ink)" }}>{SHORT(h.address)}</span>
                      </a>
                    </td>
                    <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink)" }}>{h.balance}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="chip" style={{ color: h.whitelisted ? "var(--gain)" : "var(--loss)", borderColor: h.whitelisted ? "color-mix(in oklch, var(--gain) 45%, var(--line))" : "color-mix(in oklch, var(--loss) 45%, var(--line))" }}>
                        {h.whitelisted ? "whitelisted" : h.cap ? `cap ${h.cap}` : "blocked"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 52, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span className="label">pool {state ? SHORT(state.poolAddress) : "…"} · agent {state ? SHORT(state.agent) : "…"}</span>
        <span className="label">
          <a className="link" href={config.explorerBase} target="_blank" rel="noreferrer">
            explorer · {config.explorerBase} ↗
          </a>
        </span>
      </footer>
    </main>
  );
}

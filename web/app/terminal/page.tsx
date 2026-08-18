"use client";

import { useMemo, useState } from "react";
import { useDoleai, SHORT, type Txn } from "@/lib/useDoleai";
import { config } from "@/lib/config";

// 3-column terminal shell: left rail (nav/info), main feed (live activity),
// right rail (pool pulse + holders). Search + filter pills over the feed.

type Filter = "all" | "distribute" | "attest" | "buy" | "redeem";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "distribute", label: "Distribute" },
  { key: "attest", label: "Attest" },
  { key: "buy", label: "Buy" },
  { key: "redeem", label: "Redeem" },
];

function methodOf(t: Txn): Filter {
  const m = (t.method || "").toLowerCase();
  if (m.includes("distribut")) return "distribute";
  if (m.includes("attest") || m === "record") return "attest"; // AttestationRegistry.record → Attest
  if (m === "buy" || m.includes("buy")) return "buy";
  if (m === "redeem" || m.includes("redeem")) return "redeem";
  return "all";
}

// Explorer labels the attestation tx by its contract method (AttestationRegistry.record).
// Surface it as the product's name ("attest") so the filter + feed read correctly.
const METHOD_LABEL: Record<Filter, string> = {
  all: "transfer",
  distribute: "distribute",
  attest: "attest",
  buy: "buy",
  redeem: "redeem",
};

const labelOf = (t: Txn): string => METHOD_LABEL[methodOf(t)] ?? (t.method || "transfer");

export default function TerminalPage() {
  const { state, txns, err, loading, refresh } = useDoleai();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<null | { ok: boolean; msg: string; [k: string]: unknown }>(null);

  const runAgent = useMemo(() => () => void (async () => {
    setAgentBusy(true);
    setAgentResult(null);
    try {
      const res = await fetch("/api/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setAgentResult({ ok: false, msg: String(data.error || data.message || `HTTP ${res.status}`) });
      } else {
        setAgentResult({
          ok: true,
          msg: data.status === "distributed"
            ? `attestation + distribution done for cycle ${data.cycleId}`
            : data.message || data.status,
          ...data,
        });
        // let the feed pick up the new txns
        setTimeout(() => void refresh(), 1500);
      }
    } catch (e) {
      setAgentResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setAgentBusy(false);
    }
  })(), [refresh]);

  const shown = useMemo(() => {
    let all = txns ?? [];
    if (filter !== "all") all = all.filter((t) => methodOf(t) === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      all = all.filter(
        (t) =>
          t.hash.toLowerCase().includes(q) ||
          (t.from?.toLowerCase().includes(q) ?? false) ||
          (t.to?.toLowerCase().includes(q) ?? false) ||
          (t.method?.toLowerCase().includes(q) ?? false),
      );
    }
    return all;
  }, [txns, filter, query]);

  // aggregate by method for the right rail
  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns ?? []) {
      const k = methodOf(t) === "all" ? "transfer" : methodOf(t);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [txns]);

  const addrHref = (a: string) => `${config.explorerBase}/address/${a}`;

  return (
    <main className="mx-auto max-w-7xl px-6" style={{ padding: "clamp(32px, 5vw, 56px) 24px" }}>
      <div className="term-grid">
        {/* ---- LEFT RAIL ---- */}
        <aside className="term-left">
          <div className="term-sticky" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="label" style={{ color: "var(--ink)" }}>{"// DoleAI terminal"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["/terminal", "Terminal"],
                ["/leaderboard", "Leaderboard"],
                ["/allocations", "Allocations"],
                ["/portfolio", "Portfolio"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="filter-pill" style={{ textDecoration: "none" }}>
                  {label}
                </a>
              ))}
            </div>
            <div className="label" style={{ color: "var(--faint)", fontSize: 9, lineHeight: 1.6, marginTop: 8 }}>
              AI-attested RWA revenue on BOT Chain. Every event here is a live transaction read.
            </div>
          </div>
        </aside>

        {/* ---- MAIN FEED ---- */}
        <div>
          <div className="term-feed-head">
            <span>
              live activity <span className="flick" style={{ color: "var(--signal)" }}>●</span>
            </span>
            <span className="tnum" style={{ color: "var(--faint)", fontSize: 11 }}>
              {loading && !txns.length ? "…" : `${shown.length} events`}
            </span>
          </div>

          {/* run-the-agent action */}
          <div className="panel scan" style={{ padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div className="label" style={{ color: "var(--ink)" }}>{"// run the agent"}</div>
                <div className="label" style={{ color: "var(--faint)", fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
                  The agent reads the pool, verifies a real income inflow against the World Bank benchmark, records a signed attestation, and executes the prorata distribution on-chain. Every step is a live transaction.
                </div>
              </div>
              <button className="act" style={{ background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }} onClick={() => void runAgent()} disabled={agentBusy}>
                {agentBusy ? "Running…" : "Run agent cycle"}
              </button>
            </div>

            {agentResult && (
              <div className="panel" style={{ marginTop: 12, padding: "12px 14px", borderColor: agentResult.ok ? "var(--gain)" : "var(--loss)" }}>
                <span className="label" style={{ color: agentResult.ok ? "var(--gain)" : "var(--loss)", wordBreak: "break-word" }}>
                  {agentResult.ok ? "✓ " : "⚠ "}{agentResult.msg}
                </span>
                {agentResult.ok && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {([
                      ["attestation", agentResult.attestationTxUrl],
                      ["distribution", agentResult.distributionTxUrl],
                    ] as [string, unknown][]).map(([k, v]) =>
                      typeof v === "string" && v ? (
                        <a key={k} className="link label" style={{ fontSize: 11 }} href={v} target="_blank" rel="noreferrer">
                          {k} ↗ {v.split("/").pop()}
                        </a>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* search + filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
            <div className="term-search" style={{ flex: "1 1 200px" }}>
              <span className="label" style={{ color: "var(--faint)" }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search hash, address, method…" />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`filter-pill ${filter === f.key ? "filter-on" : ""}`}
                  style={{ fontSize: 11, padding: "7px 11px" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <div className="panel" style={{ padding: "12px 16px", borderColor: "var(--loss)", marginBottom: 14 }}>
              <span className="label" style={{ color: "var(--loss)" }}>⚠ {err}</span>
            </div>
          )}

          {/* feed */}
          {shown.length === 0 && !loading && (
            <div className="panel" style={{ padding: "40px 20px", textAlign: "center" }}>
              <span className="label" style={{ color: "var(--faint)" }}>no events match · awaiting first transactions on {config.explorerBase}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {shown.map((t) => (
              <article key={t.hash} className="tweet">
                <div className="mini-avatar pixel" style={{ color: "var(--ink)" }}>
                  {methodOf(t) === "all" ? "·" : methodOf(t).slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span className="tw-name" style={{ fontSize: 13 }}>{labelOf(t)}</span>
                    <span className="tw-src tnum" style={{ fontSize: 11 }}>
                      <a href={t.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{SHORT(t.hash)}↗</a>
                    </span>
                    <span className="label" style={{ color: "var(--faint)", marginLeft: "auto" }}>
                      {t.timestamp ? new Date(t.timestamp).toISOString().replace("T", " ").slice(5, 19) + " UTC" : "—"}
                    </span>
                  </div>
                  <p style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, wordBreak: "break-word" }}>
                    from <a className="link" href={addrHref(t.from)} target="_blank" rel="noreferrer">{SHORT(t.from)}</a>{" "}
                    → <a className="link" href={addrHref(t.to)} target="_blank" rel="noreferrer">{SHORT(t.to)}</a>
                    {t.value && Number(t.value) > 0 ? (
                      <span className="tnum" style={{ color: "var(--gain)" }}> · {t.value} wei</span>
                    ) : null}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ---- RIGHT RAIL ---- */}
        <aside className="term-right">
          <div className="term-sticky" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* pool pulse */}
            <div className="side-card">
              <div className="label" style={{ marginBottom: 12 }}>{"// pool pulse"}</div>
              {[
                ["reserves", state ? `${state.paymentBalance} ${state.token.symbol}` : "—"],
                ["shares out", state ? state.totalSupply : "—"],
                ["holders", state ? String(state.holderCount) : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="label">{k}</span>
                  <span className="tnum" style={{ fontSize: 12.5, color: "var(--ink)" }}>{loading && !state ? "…" : v}</span>
                </div>
              ))}
            </div>

            {/* activity mix */}
            <div className="side-card">
              <div className="label" style={{ marginBottom: 12 }}>{"// activity mix"}</div>
              {byMethod.length === 0 && (
                <span className="label" style={{ color: "var(--faint)" }}>no data yet</span>
              )}
              {byMethod.map(([k, v]) => (
                <div key={k} className="trend-row">
                  <span className="label" style={{ flex: 1, color: "var(--ink)" }}>{k}</span>
                  <span className="tnum" style={{ fontSize: 12, color: "var(--muted)" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* recent holders */}
            <div className="side-card">
              <div className="label" style={{ marginBottom: 10 }}>{"// holders"}</div>
              {(state?.holders ?? []).slice(0, 5).map((h) => (
                <div key={h.address} className="wtf-row">
                  <span className="mini-avatar pixel" style={{ fontSize: 10 }}>{SHORT(h.address).slice(0, 2).toUpperCase()}</span>
                  <a className="link" href={addrHref(h.address)} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                    {SHORT(h.address)}
                  </a>
                  <span className="tnum" style={{ fontSize: 12, color: "var(--muted)" }}>{h.balance}</span>
                </div>
              ))}
              {!state && <span className="label" style={{ color: "var(--faint)" }}>loading…</span>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

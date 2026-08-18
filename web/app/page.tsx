"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { InteractiveDither } from "@/components/InteractiveDither";
import { DitherArt } from "@/components/DitherArt";

// DoleAI — AI-attested RWA revenue on BOT Chain. Same visual grammar as the
// reference, re-themed to the real product: an AI agent attests real off-chain
// income on-chain, then distributes to holders — evidence on the record.

const EVIDENCE = [
  {
    n: "01",
    k: "ATTEST",
    t: "Every dollar, attested.",
    shape: "signal" as const,
    d: "The agent reads real income events from a named public source, verifies them, and signs an EIP-712 attestation on BOT Chain. The evidence is hashed and indexed — you can check the inference, not just the verdict.",
  },
  {
    n: "02",
    k: "DISTRIBUTE",
    t: "Payouts execute on-chain.",
    shape: "loop" as const,
    d: "Verified gross distributes pro-rata to holders by the agent itself — idempotent, capped, and reproducible to the transaction. No spreadsheet, no trusted middleman rounding.",
  },
  {
    n: "03",
    k: "HOLD",
    t: "Income you can actually track.",
    shape: "arrows" as const,
    d: "Buy shares with WBOT at face value and redeem principal pro-rata. Every balance, every distribution, every attestation is a live BOT Chain read — nothing simulated.",
  },
];

const DEFAULT = {
  heading: "THE INCOME IS ATTESTED.",
  eyebrow: "// built on",
  body:
    "AI-attested revenue distribution for real-world assets. An agent verifies actual income from a named source, signs the evidence on BOT Chain, and pays holders — on the record, never a spreadsheet.",
};

// The BOT Chain layers DoleAI actually runs on.
type Sponsor = "bot" | "evm" | "wbot";
const SPONSOR_COPY: Record<Sponsor, { heading: string; eyebrow: string; body: string }> = {
  bot: {
    heading: "SETTLED IN BOT.",
    eyebrow: "// why BOT Chain",
    body:
      "BOT Chain is an EVM L1 purpose-built for AI agents to transact. DoleAI's attestations and payouts run as real EVM transactions with the agent as a first-class signer — gas, state, and receipts on the chain.",
  },
  evm: {
    heading: "A LEDGER THE AGENT WRITES TO.",
    eyebrow: "// why a chain at all",
    body:
      "A spreadsheet silently edits itself. A ledger can't. Every income decision the agent makes is a signed, timestamped, replayable transaction — the record is the product, and the record is immutable.",
  },
  wbot: {
    heading: "LIQUID, ON-CHAIN.",
    eyebrow: "// why WBOT",
    body:
      "Holders buy and redeem in WBOT — the wrapped BOT used as the pool's payment asset. Liquidity is real erc-20 on-chain, and every buy, redeem, and distribution is provable to the transaction hash.",
  },
};

// Types `text` in character by character whenever it changes (on hover).
function Typewriter({ text, speed = 34 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(text);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return (
    <>
      {shown}
      <span className="tw-caret" aria-hidden />
    </>
  );
}

export default function HomePage() {
  const [hovered, setHovered] = useState<Sponsor | null>(null);
  const active = hovered ? SPONSOR_COPY[hovered] : DEFAULT;
  const swapKey = hovered ?? "default";

  return (
    <main>
      {/* ---- HERO ---- */}
      <section className="relative overflow-hidden" style={{ minHeight: "min(92vh, 900px)", borderBottom: "1px solid var(--line)" }}>
        <InteractiveDither className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, color-mix(in oklch, var(--bg) 82%, transparent) 0%, color-mix(in oklch, var(--bg) 42%, transparent) 34%, transparent 68%), linear-gradient(0deg, var(--bg), transparent 26%), linear-gradient(180deg, color-mix(in oklch, var(--bg) 45%, transparent), transparent 14%)",
          }}
        />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-6" style={{ minHeight: "min(92vh, 900px)" }}>
          <div className="pixel rise" style={{ animationDelay: "0ms", fontSize: 18, letterSpacing: "0.06em", color: "var(--ink)" }}>
            <span className="kol">DO</span>LEAI
            <span className="flick" style={{ color: "var(--ink)" }}>
              _
            </span>
          </div>

          <h1
            className="rise"
            style={{
              animationDelay: "80ms",
              fontSize: "clamp(44px, 9vw, 116px)",
              margin: "18px 0 0",
              lineHeight: 0.94,
              minHeight: "1.88em",
              maxWidth: "16ch",
            }}
          >
            <Typewriter text={active.heading} />
          </h1>

          <p
            className="rise"
            style={{
              animationDelay: "180ms",
              maxWidth: "54ch",
              marginTop: 22,
              minHeight: "5.4em",
              color: hovered ? "var(--ink)" : "var(--muted)",
              fontSize: 15,
              lineHeight: 1.6,
              transition: "color 0.2s var(--ease-out-quart)",
            }}
          >
            <span key={swapKey} className="hero-swap">
              {active.body}
            </span>
          </p>

          <Link
            href="/leaderboard"
            className="rise hero-ext"
            style={{
              animationDelay: "250ms",
              marginTop: 22,
              width: "fit-content",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 13px 7px 11px",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 12,
              letterSpacing: "0.01em",
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            <span aria-hidden style={{ color: "var(--signal)", fontSize: 13 }}>
              ◇
            </span>
            <span>watch the live attestation feed</span>
            <span aria-hidden style={{ color: "var(--faint)" }}>
              ↗
            </span>
          </Link>

          <div className="rise" style={{ animationDelay: "360ms", marginTop: 30 }}>
            <div className="label" style={{ marginBottom: 14, color: hovered ? "var(--ink)" : "var(--faint)", transition: "color 0.2s" }}>
              <span key={swapKey} className="hero-swap">
                {active.eyebrow}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
              {(
                [
                  ["bot", "BOT CHAIN"],
                  ["evm", "EVM"],
                  ["wbot", "WBOT"],
                ] as const
              ).map(([key, label]) => (
                <span
                  key={key}
                  className="sponsor-word"
                  title={label}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    color: hovered === key ? "var(--ink)" : "var(--faint)",
                    transition: "color .2s",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="label" style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
          ↓ scroll to the mechanics
        </div>
      </section>

      {/* ---- EVIDENCE ---- */}
      <section className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(64px, 12vw, 140px) 24px" }}>
        <div className="label" style={{ marginBottom: 10 }}>
          {"// how the ledger works"}
        </div>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", maxWidth: "18ch" }}>
          Proven by evidence, never by opinion.
        </h2>
        <div
          style={{
            marginTop: 56,
            display: "grid",
            gap: 1,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            background: "var(--line)",
            border: "1px solid var(--line)",
          }}
        >
          {EVIDENCE.map((e) => (
            <div key={e.n} className="scan" style={{ background: "var(--bg)", padding: "28px 26px 34px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="pixel" style={{ fontSize: 22, color: "var(--faint)" }}>
                  {e.n}
                </span>
                <span className="label">{e.k}</span>
              </div>
              <div style={{ marginTop: 20, height: 150, background: "var(--dark)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <DitherArt shape={e.shape} invert gap={4} className="h-full w-full" />
              </div>
              <h3 style={{ fontSize: 22, marginTop: 22 }}>{e.t}</h3>
              <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>{e.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- WHAT IT'S FOR (value-prop bento) ---- */}
      <section className="mx-auto max-w-6xl px-6" style={{ padding: "0 24px clamp(72px, 12vw, 140px)" }}>
        <div className="label" style={{ marginBottom: 10 }}>
          {"// why it exists"}
        </div>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", maxWidth: "20ch" }}>
          The trust gap RWA deserves better than.
        </h2>

        <div className="bento" style={{ marginTop: 56 }}>
          {/* 01 — feature cell: immutable attestation ledger */}
          <div className="bento-cell bento-lg scan">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="pixel" style={{ fontSize: 22, color: "var(--faint)" }}>
                01
              </span>
              <span className="label">immutable attestations</span>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 180,
                marginTop: 22,
                background: "var(--dark)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DitherArt shape="signal" invert gap={4} className="h-full w-full" />
            </div>
            <h3 style={{ fontSize: 26, marginTop: 24 }}>Attestations stay on the record.</h3>
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14, lineHeight: 1.7, maxWidth: "46ch" }}>
              A real-estate yield or a licensing fee is only as good as the proving of it. The agent&apos;s verified income call is signed and hashed on-chain — the evidence chain behind every distribution is linkable, not a claim.
            </p>
            <div className="bento-flag">
              <span className="db-mark">SIGNED</span>
              <span className="label" style={{ color: "var(--loss)" }}>
                by the agent, on-chain
              </span>
            </div>
          </div>

          {/* 02 — verified source */}
          <div className="bento-cell bento-sm scan">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="pixel" style={{ fontSize: 22, color: "var(--faint)" }}>
                02
              </span>
              <span className="label">named source</span>
            </div>
            <h3 style={{ fontSize: 21, marginTop: 20 }}>Verified against a real source.</h3>
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
              No &ldquo;trust us&rdquo; dashboard. The income events come from a named, public source the config names — and the agent&apos;s verification is itself attested.
            </p>
            <div style={{ marginTop: "auto", paddingTop: 18 }}>
              <span className="chip">source · env-named</span>
            </div>
          </div>

          {/* 03 — real execution */}
          <div className="bento-cell bento-sm scan">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="pixel" style={{ fontSize: 22, color: "var(--faint)" }}>
                03
              </span>
              <span className="label">real txns</span>
            </div>
            <h3 style={{ fontSize: 21, marginTop: 20 }}>Nothing on this page is simulated.</h3>
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
              Every balance, distribution, and attestation is a live BOT Chain read. Open any hash in the explorer and the money is there.
            </p>
            <div style={{ marginTop: "auto", paddingTop: 18 }}>
              <span className="chip">live · chain 968</span>
            </div>
          </div>

          {/* 04 — full-width banner: a new way to participate */}
          <div className="bento-cell bento-wide scan" style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 340px", padding: "28px 26px 30px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="pixel" style={{ fontSize: 22, color: "var(--faint)" }}>
                    04
                  </span>
                  <span className="label">participate</span>
                </div>
                <h3 style={{ fontSize: 24, marginTop: 20 }}>A share of attested income.</h3>
                <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14, lineHeight: 1.7, maxWidth: "54ch" }}>
                  Buy shares with WBOT at face value,{" "}
                  <em style={{ fontStyle: "normal", color: "var(--gain)" }}>earn</em> pro-rata from{" "}
                  <em style={{ fontStyle: "normal", color: "var(--loss)" }}>attested</em> income, and redeem principal whenever you like. The pool, the payouts, and the proof are all on-chain.
                </p>
                <div style={{ marginTop: "auto", paddingTop: 18 }}>
                  <Link href="/portfolio" className="chip" style={{ textDecoration: "none" }}>
                    participate ↗
                  </Link>
                </div>
              </div>
              <div style={{ flex: "1 1 300px", minHeight: 220, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "end" }}>
                <DitherArt shape="arrows" invert gap={4} className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer
        className="mx-auto max-w-6xl px-6"
        style={{ padding: "28px 24px 48px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <span className="pixel" style={{ color: "var(--faint)" }}>
          <span className="kol">DO</span>LEAI
        </span>
        <span className="label">the income is attested · live on-chain reads, zero simulation</span>
      </footer>
    </main>
  );
}

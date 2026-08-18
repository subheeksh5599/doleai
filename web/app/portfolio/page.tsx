"use client";

import { useCallback, useState } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { useDoleai, fmtTime, SHORT } from "@/lib/useDoleai";
import { config, POOL_ABI, ERC20_ABI } from "@/lib/config";
import { useWallet } from "@/components/Header";

export default function PortfolioPage() {
  const { state, err: dataErr, loading } = useDoleai();
  const { account, connect, disconnect, connected, ready } = useWallet();
  const [amount, setAmount] = useState("100");
  const [txState, setTxState] = useState("");
  const [txErr, setTxErr] = useState("");

  const signerFor = useCallback(async () => {
    if (!window.ethereum) throw new Error("No wallet provider");
    const provider = new BrowserProvider(window.ethereum as never);
    await provider.send("eth_requestAccounts", []);
    return (await provider.getSigner()) as never;
  }, []);

  const act = useCallback(
    async (kind: "buy" | "redeem") => {
      if (!account) return setTxErr("Connect a wallet first");
      setTxState(`waiting for wallet signature…`);
      setTxErr("");
      try {
        const signer = await signerFor();
        const pool = new Contract(config.poolAddress, POOL_ABI, signer);
        const amt = parseEther(amount || "1");
        let tx;
        if (kind === "buy") {
          const erc = new Contract(config.paymentToken, ERC20_ABI, signer);
          await (await erc.approve(config.poolAddress, amt)).wait();
          tx = await pool.buy(amt);
        } else {
          tx = await pool.redeem(amt);
        }
        const receipt = await tx.wait();
        setTxState(`tx ${receipt.hash} — ${kind} confirmed · ${config.explorerBase}/tx/${receipt.hash}`);
      } catch (e) {
        const msg = e && typeof e === "object" && "shortMessage" in e
          ? String((e as { shortMessage?: unknown }).shortMessage ?? "")
          : e instanceof Error
            ? e.message
            : String(e);
        setTxErr(msg || String(e));
        setTxState("");
      }
    },
    [account, amount, signerFor],
  );

  return (
    <main className="mx-auto max-w-6xl px-6" style={{ padding: "clamp(40px, 6vw, 72px) 24px" }}>
      <div className="label" style={{ marginBottom: 10 }}>
        {"// participate"}
      </div>
      <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", maxWidth: "20ch" }}>
        A share of attested income.
      </h2>
      <p style={{ marginTop: 14, maxWidth: "60ch", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
        Buy shares with {state?.token.symbol ?? "WBOT"} at face value and redeem principal pro-rata. Both are real transactions on BOT Chain chain {config.chainId}.
      </p>

      {/* account strip */}
      <div className="panel scan" style={{ marginTop: 32, padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <span className="label" style={{ color: "var(--ink)" }}>
          {ready && connected && account ? `wallet · ${account.slice(0, 6)}…${account.slice(-4)}` : "no wallet connected"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {!ready || !connected ? (
            <button className="act" onClick={() => void connect()}>
              Connect
            </button>
          ) : (
            <button className="act" onClick={disconnect} style={{ color: "var(--loss)" }}>
              Sign out
            </button>
          )}
        </div>
      </div>

      {(dataErr || txErr) && (
        <div className="panel" style={{ marginTop: 18, padding: "12px 16px", borderColor: "var(--loss)" }}>
          <span className="label" style={{ color: "var(--loss)" }}>
            ⚠ {txErr || dataErr}
          </span>
        </div>
      )}
      {txState && (
        <div className="panel" style={{ marginTop: 18, padding: "12px 16px", borderColor: "var(--gain)" }}>
          <span className="label" style={{ color: "var(--gain)", wordBreak: "break-all" }}>
            ✓ {txState}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", marginTop: 32 }}>
        {/* trade */}
        <section className="panel scan" style={{ padding: "24px 26px" }}>
          <div className="label" style={{ marginBottom: 14 }}>
            {"// buy / redeem"}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="amount"
              style={{
                flex: "1 1 140px",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "9px 12px",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button className="act" style={{ background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" }} onClick={() => void act("buy")} disabled={!account}>
              Buy
            </button>
            <button className="act" onClick={() => void act("redeem")} disabled={!account}>
              Redeem
            </button>
          </div>
          <div className="label" style={{ marginTop: 16, lineHeight: 1.6, color: "var(--faint)" }}>
            {!account
              ? "connect a wallet (MetaMask, chain " + config.chainId + ") to transact"
              : "buy charges " + (state?.token.symbol ?? "WBOT") + " at face value · redeem returns your principal pro-rata"}
          </div>
        </section>

        {/* pool stats */}
        <section className="panel scan" style={{ padding: "24px 26px" }}>
          <div className="label" style={{ marginBottom: 14 }}>
            {"// pool"}
          </div>
          {[
            ["reserves", loading ? "…" : `${state?.paymentBalance ?? "—"} ${state?.token.symbol ?? ""}`],
            ["shares out", loading ? "…" : state?.totalSupply ?? "—"],
            ["holders", loading ? "…" : String(state?.holderCount ?? "—")],
            ["distributions", loading ? "…" : String(state?.distributions.length ?? "—")],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span className="label">{k}</span>
              <span className="tnum" style={{ fontSize: 13, color: "var(--ink)" }}>
                {v}
              </span>
            </div>
          ))}
        </section>
      </div>

      {/* distribution history */}
      <section style={{ marginTop: 40 }}>
        <div className="label" style={{ marginBottom: 12 }}>
          {"// distribution history"}
        </div>
        <div className="panel scan" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                  {["#", "cycle", "gross", "paid", "receivers", "attestation", "time (UTC)"].map((h) => (
                    <th key={h} className="label" style={{ padding: "12px 16px", color: "var(--faint)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!state && (
                  <tr>
                    <td colSpan={7} className="tnum" style={{ padding: "24px 16px", color: "var(--faint)", fontSize: 12 }}>
                      loading…
                    </td>
                  </tr>
                )}
                {state?.distributions
                  .slice()
                  .reverse()
                  .map((d) => (
                    <tr key={d.id} className="wl-row" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.id}</td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.cycleId}</td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12 }}>{d.grossAmount}</td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--gain)" }}>{d.totalPaid}</td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>{d.recipientCount}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="tnum" style={{ fontSize: 11, color: "var(--faint)" }}>{SHORT(d.attestationUid) || "—"}</span>
                      </td>
                      <td className="tnum" style={{ padding: "12px 16px", fontSize: 11, color: "var(--faint)" }}>{fmtTime(d.timestamp)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span className="label">all transactions are real · pool {state ? SHORT(state.poolAddress) : "…"}</span>
        <span className="label">
          <a className="link" href={config.explorerBase} target="_blank" rel="noreferrer">
            explorer ↗
          </a>
        </span>
      </footer>
    </main>
  );
}

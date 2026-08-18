"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, formatUnits } from "ethers";
import { NETWORK, type NetCfg } from "@/lib/networks";
import { useLocalStorageValue } from "@/lib/useClientState";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Wallet hook — connect via injected provider (MetaMask etc.), track address +
// a per-network native/token balance set. Reused by the header wallet menu.
export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.ethereum?.on) return;
    // Defer the readiness flip out of the synchronous effect body (avoids
    // strict-mode setState-in-effect lint); the Connect gate still resolves
    // on the same tick as the account discovery.
    const id = window.setTimeout(() => setReady(true), 0);
    const onAccounts = (a: unknown) => {
      const arr = Array.isArray(a) ? (a as string[]) : [];
      setAccount(arr[0] ?? null);
      setConnected(arr.length > 0);
    };
    window.ethereum.on("accountsChanged", onAccounts);
    // discover already-connected account
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((a: unknown) => onAccounts(Array.isArray(a) ? (a as string[]) : []))
      .catch(() => {});
    return () => {
      window.clearTimeout(id);
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum as never);
    const accounts = await provider.send("eth_requestAccounts", []);
    // Enforce BOT Chain mainnet (chain 677) — no testnet fallback. If the
    // wallet is on another chain, switch (or add) 677 before proceeding.
    try {
      const chainId = await provider.send("eth_chainId", []);
      if (String(chainId).toLowerCase() !== "0x2a5") {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: "0x2a5" }]);
        } catch (e: unknown) {
          if ((e as { code?: number })?.code === 4902) {
            await provider.send("wallet_addEthereumChain", [
              {
                chainId: "0x2a5",
                chainName: "BOT Chain Mainnet",
                rpcUrls: ["https://rpc.botchain.ai"],
                nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
                blockExplorerUrls: ["https://scan.botchain.ai"],
              },
            ]);
          }
        }
      }
    } catch {
      // non-fatal: account is still surfaced; on-chain reads always use mainnet RPC
    }
    setAccount(Array.isArray(accounts) && accounts.length ? String(accounts[0]) : null);
    setConnected(Array.isArray(accounts) && accounts.length > 0);
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setConnected(false);
  }, []);

  return { ready, connected, account, connect, disconnect };
}

export function Header() {
  const { ready, connected, account, connect, disconnect } = useWallet();
  const cfg = NETWORK;

  // balances keyed by token symbol, recomputed on account change
  const [bal, setBal] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    if (!account) return;
    const provider = new JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true });
    const tokens = NETWORK.tokens;
    (async () => {
      const out: Record<string, number> = {};
      for (const t of tokens) {
        try {
          if (!t.address) {
            const wei = await provider.getBalance(account as `0x${string}`);
            out[t.symbol] = Number(formatEther(wei));
          } else {
            const c = new Contract(t.address as `0x${string}`, ERC20_BALANCE_ABI, provider);
            const raw = (await c.balanceOf(account as `0x${string}`)) as bigint;
            out[t.symbol] = Number(formatUnits(raw, t.decimals));
          }
        } catch {
          out[t.symbol] = 0;
        }
      }
      if (alive) setBal(out);
    })();
    return () => {
      alive = false;
    };
  }, [account, cfg.rpcUrl, cfg.chainId]);

  const btn: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    border: "1px solid var(--line-strong)",
    borderRadius: "var(--radius)",
    padding: "6px 12px",
    background: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
    transition: "color .2s, border-color .2s, background .2s",
  };
  const btnPrimary: React.CSSProperties = { ...btn, background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
        padding: "10px 24px",
        borderBottom: "1px solid var(--line)",
        background: "color-mix(in oklch, var(--bg) 80%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Link href="/" className="pixel" style={{ fontSize: 22, letterSpacing: "0.03em", color: "var(--ink)", marginRight: 8 }}>
        <span className="kol">DO</span>LEAI
      </Link>
      <nav style={{ display: "flex", gap: 20 }}>
        {[
          ["/terminal", "Terminal"],
          ["/leaderboard", "Leaderboard"],
          ["/allocations", "Allocations"],
          ["/portfolio", "Portfolio"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="link label" style={{ fontSize: 11 }}>
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span className="label" style={{ color: "var(--loss)", fontSize: 10 }}>
          ● mainnet 677
        </span>

        {(!ready || !connected) && (
          <button style={btnPrimary} onClick={() => void connect()}>
            Connect
          </button>
        )}

        {ready && connected && account && (
          <WalletMenu address={account} cfg={cfg} bal={bal} onSignOut={disconnect} />
        )}
      </div>
    </header>
  );
}

function WalletMenu({
  address,
  cfg,
  bal,
  onSignOut,
}: {
  address: string;
  cfg: NetCfg;
  bal: Record<string, number>;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const stored = useLocalStorageValue("doleai.pinnedToken");
  const [override, setOverride] = useState<string | null>(null);
  const pinned = override ?? stored;
  const pin = (sym: string) => {
    setOverride(sym);
    try {
      window.localStorage.setItem("doleai.pinnedToken", sym);
    } catch {
      /* ignore */
    }
  };

  const tokens = cfg.tokens;
  const defaultPin = tokens[1]?.symbol ?? tokens[0]?.symbol ?? "BOT";
  const pinnedRow = tokens.find((t) => t.symbol === (pinned ?? defaultPin)) ?? tokens[0];
  const fmt = (n: number) => (n >= 1 ? n.toFixed(2) : n.toFixed(4));

  const itemBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    padding: "8px 10px",
    background: "transparent",
    color: "var(--muted)",
    cursor: "pointer",
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius)",
          padding: "5px 10px",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span className="label" style={{ color: "var(--gain)" }}>
          ●
        </span>
        <span className="label tnum" style={{ fontSize: 11, color: "var(--ink)" }}>
          {fmt(bal[pinnedRow.symbol] ?? 0)} {pinnedRow.symbol}
        </span>
        <span className="label" style={{ color: "var(--faint)", fontSize: 9 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 61,
              width: 268,
              background: "var(--bg)",
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--radius)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: "0 12px 32px color-mix(in oklch, var(--ink) 12%, transparent)",
            }}
          >
            <div className="label" style={{ color: "var(--faint)" }}>
              wallet · {cfg.chainName}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(address).catch(() => {});
              }}
              title="copy wallet address"
              style={{ ...itemBtn, justifyContent: "space-between", textTransform: "none", letterSpacing: 0, color: "var(--ink)" }}
            >
              <span className="tnum" style={{ fontSize: 11 }}>
                {address.slice(0, 10)}…{address.slice(-8)}
              </span>
              <span className="label" style={{ color: "var(--faint)" }}>
                copy ⧉
              </span>
            </button>

            <div className="label" style={{ color: "var(--faint)", marginTop: 2 }}>
              balances · ★ pins to the bar
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {tokens.map((t) => {
                const isPin = (pinnedRow?.symbol ?? "") === t.symbol;
                return (
                  <div key={t.symbol} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px" }}>
                    <button
                      onClick={() => pin(t.symbol)}
                      title={isPin ? "pinned" : "pin to the top bar"}
                      style={{
                        background: "none",
                        border: 0,
                        cursor: "pointer",
                        color: isPin ? "var(--gain)" : "var(--faint)",
                        fontSize: 13,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      {isPin ? "★" : "☆"}
                    </button>
                    <span className="label" style={{ flex: 1, color: "var(--ink)" }}>
                      {t.symbol}
                    </span>
                    <span className="tnum" style={{ fontSize: 12, color: (bal[t.symbol] ?? 0) > 0 ? "var(--ink)" : "var(--faint)" }}>
                      {fmt(bal[t.symbol] ?? 0)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ height: 1, background: "var(--line)", margin: "2px 0" }} />
            <button onClick={onSignOut} style={{ ...itemBtn, color: "var(--loss)" }}>
              Sign out
            </button>

            <div className="label" style={{ color: "var(--faint)", fontSize: 9, textAlign: "center", marginTop: 2, lineHeight: 1.5 }}>
              live on-chain balances · {cfg.chainName}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

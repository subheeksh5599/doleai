"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { JsonRpcProvider, BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import { config, POOL_ABI, ERC20_ABI, SHORT } from "../lib/config";

interface State {
  poolAddress: string;
  paymentBalance: string;
  totalSupply: string;
  holderCount: number;
  owner: string;
  agent: string;
  paused: boolean;
  token: { name: string; symbol: string; decimals: number; poolBalance: string };
  holders: { address: string; balance: string; whitelisted: boolean; cap: string | null }[];
  distributions: { id: number; cycleId: number; grossAmount: string; totalPaid: string; recipientCount: number; timestamp: number; attestationUid: string }[];
  attestations: { uid: string; cycleId: number; grossAmount: string; sourceRef: string; signer: string; blockNumber: number; timestamp: number }[];
}

interface Txn {
  hash: string;
  from: string;
  to: string;
  method: string;
  timestamp: string;
  value: string;
  url: string;
}

function fmtTime(ts: number) {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export default function Page() {
  const [state, setState] = useState<State | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [err, setErr] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("1");
  const [txState, setTxState] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([fetch("/api/state").then((r) => r.json()), fetch("/api/activity").then((r) => r.json())]);
      if (s.error) setErr(s.error);
      else setState(s);
      if (a.error) setErr(a.error);
      else setTxns(a.rows ?? []);
    } catch (e: any) {
      setErr(String(e.message || e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const connect = useCallback(async () => {
    if (!window.ethereum) return setErr("No wallet provider found (MetaMask required).");
    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setErr("");
    } catch (e: any) {
      setErr(String(e.message || e));
    }
  }, []);

  const signerFor = useCallback(async () => {
    if (!window.ethereum) throw new Error("No wallet provider");
    const provider = new BrowserProvider(window.ethereum as any);
    await provider.send("eth_requestAccounts", []);
    return await provider.getSigner();
  }, []);

  const callBuy = useCallback(async (token: "buy" | "redeem") => {
    if (!account) return setErr("Connect a wallet first");
    setTxState("waiting for wallet signature…");
    setErr("");
    try {
      const signer = await signerFor();
      const pool = new Contract(config.poolAddress, POOL_ABI, signer);
      const amt = parseEther(amount || "1");
      let tx;
      if (token === "buy") {
        const erc = new Contract(config.paymentToken, ERC20_ABI, signer);
        await (await erc.approve(config.poolAddress, amt)).wait();
        tx = await pool.buy(amt);
      } else {
        tx = await pool.redeem(amt);
      }
      const receipt = await tx.wait();
      setTxState(`tx ${receipt.hash} confirmed — ${token} complete`);
      refresh();
    } catch (e: any) {
      setErr(String(e.shortMessage || e.message || e));
      setTxState("");
    }
  }, [account, amount, refresh, signerFor]);

  const networkId = `chain ${config.chainId}`;

  const addrHref = (a: string) => `${config.explorerBase}/address/${a}`;

  return (
    <main className="min-h-screen bg-[#0a0e14] text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-[#0d1220] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">AttestPay</h1>
          <p className="text-xs text-zinc-500 font-mono">AI-attested revenue distribution · BOT Chain · {networkId}</p>
        </div>
        <div className="flex items-center gap-2">
          {account ? (
            <>
              <Badge variant="secondary" className="font-mono">{SHORT(account)}</Badge>
              <Button size="sm" variant="outline" onClick={() => { setAccount(""); setTxState(""); }}>Disconnect</Button>
            </>
          ) : (
            <Button size="sm" onClick={connect}>Connect wallet</Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col gap-6">
        {err && (
          <Alert variant="destructive">
            <AlertDescription className="font-mono text-xs break-all">{err}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {!state ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800/60" />)
          ) : (
            <>
              <Card className="bg-[#0d1220] border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-zinc-400 uppercase tracking-wider">Pool reserves</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono text-white">{state.paymentBalance} <span className="text-sm text-zinc-400">{state.token.symbol}</span></CardContent>
              </Card>
              <Card className="bg-[#0d1220] border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-zinc-400 uppercase tracking-wider">Shares outstanding</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono text-white">{state.totalSupply} <span className="text-sm text-zinc-400">APAY</span></CardContent>
              </Card>
              <Card className="bg-[#0d1220] border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-zinc-400 uppercase tracking-wider">Holders</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono text-white">{state.holderCount}</CardContent>
              </Card>
              <Card className="bg-[#0d1220] border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-zinc-400 uppercase tracking-wider">Distributions</CardTitle></CardHeader>
                <CardContent className="text-2xl font-mono text-white">{state.distributions.length}</CardContent>
              </Card>
            </>
          )}
        </section>

        {/* Live transaction feed — the showpiece */}
        <Card className="bg-[#0d1220] border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Live chain activity
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </CardTitle>
            <CardDescription className="font-mono text-xs text-zinc-500">
              Real transactions touching AttestPay contracts — each row opens in the explorer. Source: {config.explorerApi}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0d1220] text-zinc-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">txn</th>
                    <th className="px-4 py-2 text-left">age</th>
                    <th className="px-4 py-2 text-left">from</th>
                    <th className="px-4 py-2 text-left">to</th>
                    <th className="px-4 py-2 text-left">action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {txns.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-600 font-mono text-xs">awaiting first transactions…</td></tr>
                  )}
                  {txns.map((t) => (
                    <tr key={t.hash} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 font-mono text-xs">
                        <a href={t.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{SHORT(t.hash)}↗</a>
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-400">{t.timestamp ? new Date(t.timestamp).toISOString().replace("T", " ").slice(5, 19) : "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">{t.from ? <a className="hover:underline text-zinc-300" target="_blank" rel="noreferrer" href={addrHref(t.from)}>{SHORT(t.from)}</a> : "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">{t.to ? <a className="hover:underline text-zinc-300" target="_blank" rel="noreferrer" href={addrHref(t.to)}>{SHORT(t.to)}</a> : "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{t.method || "transfer"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Investors */}
          <Card className="bg-[#0d1220] border-zinc-800">
            <CardHeader>
              <CardTitle>Participate</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Buy shares with {state?.token.symbol ?? "WBOT"} at face value, or redeem principal pro-rata. Both are real transactions on chain {config.chainId}.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-zinc-900 border-zinc-700 font-mono" placeholder="amount" />
                <Button onClick={() => callBuy("buy")} disabled={!account}>Buy</Button>
                <Button variant="outline" onClick={() => callBuy("redeem")} disabled={!account}>Redeem</Button>
              </div>
              {!account && <p className="text-xs text-zinc-600">Connect a wallet (MetaMask, chain {config.chainId}) to transact.</p>}
              {txState && <p className="text-xs font-mono text-emerald-400 break-all">{txState}</p>}
            </CardContent>
          </Card>

          {/* Holders */}
          <Card className="bg-[#0d1220] border-zinc-800">
            <CardHeader><CardTitle>Holders</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-zinc-500 text-xs uppercase tracking-wider">
                  <tr><th className="px-4 py-2 text-left">address</th><th className="px-4 py-2 text-left">shares</th><th className="px-4 py-2 text-left">status</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {!state && <tr><td colSpan={3} className="px-4 py-4 text-center text-zinc-600 font-mono text-xs">loading…</td></tr>}
                  {state?.holders.map((h) => (
                    <tr key={h.address} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-2 font-mono text-xs"><a className="hover:underline text-zinc-300" target="_blank" rel="noreferrer" href={addrHref(h.address)}>{SHORT(h.address)}</a></td>
                      <td className="px-4 py-2 font-mono text-xs">{h.balance}</td>
                      <td className="px-4 py-2"><Badge variant={h.whitelisted ? "default" : "destructive"} className="text-[10px]">{h.whitelisted ? "whitelisted" : "blocked"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Distributions */}
          <Card className="bg-[#0d1220] border-zinc-800">
            <CardHeader><CardTitle>Distributions</CardTitle><CardDescription className="text-xs text-zinc-500">Prorata payouts executed by the agent on-chain</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0d1220] text-zinc-500 text-xs uppercase tracking-wider">
                    <tr><th className="px-4 py-2 text-left">#</th><th className="px-4 py-2 text-left">cycle</th><th className="px-4 py-2 text-left">gross</th><th className="px-4 py-2 text-left">paid</th><th className="px-4 py-2 text-left">receivers</th><th className="px-4 py-2 text-left">time (UTC)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {!state && <tr><td colSpan={6} className="px-4 py-4 text-center text-zinc-600 font-mono text-xs">loading…</td></tr>}
                    {state?.distributions.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-2 font-mono text-xs">{d.id}</td>
                        <td className="px-4 py-2 font-mono text-xs">{d.cycleId}</td>
                        <td className="px-4 py-2 font-mono text-xs">{d.grossAmount}</td>
                        <td className="px-4 py-2 font-mono text-xs text-emerald-400">{d.totalPaid}</td>
                        <td className="px-4 py-2 text-xs">{d.recipientCount}</td>
                        <td className="px-4 py-2 text-xs text-zinc-500">{fmtTime(d.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Attestations */}
          <Card className="bg-[#0d1220] border-zinc-800">
            <CardHeader><CardTitle>Agent attestations</CardTitle><CardDescription className="text-xs text-zinc-500">On-chain records of the AI agent's verified income decisions (signed, evidence-hashed)</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0d1220] text-zinc-500 text-xs uppercase tracking-wider">
                    <tr><th className="px-4 py-2 text-left">cycle</th><th className="px-4 py-2 text-left">gross</th><th className="px-4 py-2 text-left">signer</th><th className="px-4 py-2 text-left">source</th><th className="px-4 py-2 text-left">block</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {!state && <tr><td colSpan={5} className="px-4 py-4 text-center text-zinc-600 font-mono text-xs">loading…</td></tr>}
                    {state?.attestations.map((a) => (
                      <tr key={a.uid} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-2 font-mono text-xs">{a.cycleId}</td>
                        <td className="px-4 py-2 font-mono text-xs">{a.grossAmount}</td>
                        <td className="px-4 py-2 font-mono text-xs"><a className="hover:underline text-zinc-300" target="_blank" rel="noreferrer" href={addrHref(a.signer)}>{SHORT(a.signer)}</a></td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-500 max-w-40 truncate" title={a.sourceRef}>{a.sourceRef}</td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-500">{a.blockNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="border-t border-zinc-800/60 pt-4 pb-8 text-xs text-zinc-600 font-mono">
          <p>pool: {state?.poolAddress ?? config.poolAddress} · agent key: {state ? SHORT(state.agent) : "…"} · all numbers above are live on-chain reads; no simulated data</p>
          <p className="mt-1">Explorer: <a className="text-sky-500 hover:underline" href={config.explorerBase} target="_blank" rel="noreferrer">{config.explorerBase}</a></p>
        </footer>
      </div>
    </main>
  );
}
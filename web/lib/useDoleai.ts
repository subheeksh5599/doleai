"use client";

import { useCallback, useEffect, useState } from "react";

export interface Distribution {
  id: number;
  cycleId: number;
  grossAmount: string;
  totalPaid: string;
  recipientCount: number;
  timestamp: number;
  attestationUid: string;
}

export interface Attestation {
  uid: string;
  cycleId: number;
  grossAmount: string;
  sourceRef: string;
  signer: string;
  blockNumber: number;
  timestamp: number;
}

export interface Holder {
  address: string;
  balance: string;
  whitelisted: boolean;
  cap: string | null;
}

export interface DoleaiState {
  poolAddress: string;
  paymentBalance: string;
  totalSupply: string;
  holderCount: number;
  owner: string;
  agent: string;
  paused: boolean;
  token: { name: string; symbol: string; decimals: number; poolBalance: string };
  holders: Holder[];
  distributions: Distribution[];
  attestations: Attestation[];
}

export interface Txn {
  hash: string;
  from: string;
  to: string;
  method: string;
  timestamp: string;
  value: string;
  url: string;
}

// Shared poller for the two read-only endpoints the UI is built on. Polls every
// `interval` ms and surfaces error + loading. Used by every page that shows live
// on-chain data so they all stay in sync.
export function useDoleai(interval = 6000) {
  const [state, setState] = useState<DoleaiState | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        fetch("/api/state").then((r) => r.json()),
        fetch("/api/activity").then((r) => r.json()),
      ]);
      if (s.error) setErr(String(s.error));
      else {
        setState(s as DoleaiState);
        setErr("");
      }
      if (!a.error) setTxns(a.rows ?? []);
      setLoading(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // First fetch deferred out of the effect body (avoids the strict-mode
    // setState-in-effect lint) and onto a microtask, then poll on an interval.
    const id = window.setTimeout(() => void refresh(), 0);
    const t = window.setInterval(() => void refresh(), interval);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(t);
    };
  }, [refresh, interval]);

  return { state, txns, err, loading, refresh };
}

export const fmtTime = (ts: number) =>
  ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—";

export const SHORT = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

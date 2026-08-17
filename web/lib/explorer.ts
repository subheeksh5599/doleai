import { config } from "./config";

// Keyless Blockscout v2 API (scan.botchain.ai mainnet, scan.bohr.life testnet).
// Lists real transactions touching the AttestPay contracts.

export interface TxnRow {
  hash: string;
  from: string;
  to: string;
  method: string;
  timestamp: string; // ISO
  value: string;
  url: string;
}

function explorerTxUrl(hash: string): string {
  return `${config.explorerBase}/tx/${hash}`;
}

export async function fetchContractTxns(address: string): Promise<TxnRow[]> {
  const url = `${config.explorerApi}/v2/addresses/${address}/transactions?filter=to${encodeURIComponent(`|`)}${address}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`explorer api ${res.status}`);
  const data = await res.json();
  const rows: TxnRow[] = (data?.items ?? []).map((t: any) => ({
    hash: t.hash,
    from: t.from?.hash ?? "",
    to: t.to?.hash ?? "",
    method: t.method ?? "",
    timestamp: t.timestamp ?? "",
    value: t.value ?? "0",
    url: explorerTxUrl(t.hash),
  }));
  return rows.slice(0, 40);
}

export async function fetchRecentByAddresses(addresses: string[]): Promise<TxnRow[]> {
  const byBlock: Record<number, TxnRow[]> = {};
  for (const addr of addresses) {
    try {
      const rows = await fetchContractTxns(addr);
      for (const r of rows) {
        const key = new Date(r.timestamp).getTime() + Math.random(); // keep order stable enough
        byBlock[key] = [r];
      }
    } catch {
      // skip unavailable address feeds
    }
  }
  return Object.values(byBlock)
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40);
}
// BOT Chain mainnet (chain 677) — the only network surfaced in the UI.
// No testnet fallback: the product runs on mainnet only.
export interface NetCfg {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerBase: string;
  explorerApi: string;
  label: string;
  // tokens surfaced in the wallet menu: address=null → native coin.
  // WBOT is BOT Chain's canonical wrapped token (same address on both chains).
  tokens: { symbol: string; address: string | null; decimals: number }[];
}

export const NETWORK: NetCfg = {
  chainId: 677,
  chainName: "BOT Chain Mainnet",
  rpcUrl: "https://rpc.botchain.ai",
  explorerBase: "https://scan.botchain.ai",
  explorerApi: "https://scan.botchain.ai/api",
  label: "mainnet",
  tokens: [
    { symbol: "BOT", address: null, decimals: 18 },
    { symbol: "WBOT", address: "0xD5452816194a3784dBa983426cCe7c122F4abd30", decimals: 18 },
  ],
};

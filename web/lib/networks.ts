// BOT Chain networks for the testnet/mainnet toggle in the header.
export type Network = "testnet" | "mainnet";

export interface NetCfg {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerBase: string;
  explorerApi: string;
  label: string;
  // tokens surfaced in the vault menu: address=null → native coin
  tokens: { symbol: string; address: string | null; decimals: number }[];
  faucet?: string;
}

export const NETWORKS: Record<Network, NetCfg> = {
  testnet: {
    chainId: 968,
    chainName: "BOT Chain Testnet",
    rpcUrl: "https://rpc.bohr.life",
    explorerBase: "https://scan.bohr.life",
    explorerApi: "https://scan.bohr.life/api",
    label: "testnet",
    faucet: "https://faucet.botchain.ai/basic",
    tokens: [
      { symbol: "BOT", address: null, decimals: 18 },
      { symbol: "WBOT", address: "0xD5452816194a3784dBa983426cCe7c122F4abd30", decimals: 18 },
    ],
  },
  mainnet: {
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
  },
};

export const netCfg = (n: Network): NetCfg => NETWORKS[n];

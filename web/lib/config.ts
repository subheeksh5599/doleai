// Runtime configuration. All values come from NEXT_PUBLIC_* env vars; the app
// renders nothing without them (fail-fast at startup).

const req = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

export const config = {
  rpcUrl: req("NEXT_PUBLIC_RPC_URL"),
  poolAddress: req("NEXT_PUBLIC_POOL_ADDRESS"),
  paymentToken: req("NEXT_PUBLIC_PAYMENT_TOKEN"),
  agentAddress: process.env.NEXT_PUBLIC_AGENT_ADDRESS || "",
  explorerApi: req("NEXT_PUBLIC_EXPLORER_API"),
  explorerBase: req("NEXT_PUBLIC_EXPLORER_BASE"),
  chainId: Number(req("NEXT_PUBLIC_CHAIN_ID")),
};

export const POOL_ABI = [
  "function assetToken() view returns (address)",
  "function policyRegistry() view returns (address)",
  "function attestationRegistry() view returns (address)",
  "function paymentToken() view returns (address)",
  "function owner() view returns (address)",
  "function agent() view returns (address)",
  "function paymentBalance() view returns (uint256)",
  "function holderCount() view returns (uint256)",
  "function holders(uint256) view returns (address)",
  "function getDistribution(uint256) view returns (uint256 id, uint256 cycleId, uint256 grossAmount, uint256 totalPaid, uint256 recipientCount, uint256 timestamp, bytes32 attestationUid)",
  "function nextDistId() view returns (uint256)",
  "function paused() view returns (bool)",
  "function subscribe(uint256)",
  "function buy(uint256)",
  "function redeem(uint256)",
  "function setWhitelisted(address, bool)",
  "function setHolderCap(address, uint256)",
  "event DistributionExecuted(uint256 indexed id, uint256 indexed cycleId, uint256 grossAmount, uint256 totalPaid, uint256 recipientCount, bytes32 attestationUid)"
];

export const ASSET_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

export const REGISTRY_ABI = [
  "function attestations(bytes32) view returns (bytes32 uid, address pool, uint256 cycleId, uint256 grossAmount, bytes32 evidenceHash, string sourceRef, address signer, uint256 blockNumber, uint256 timestamp)",
  "function uids(uint256) view returns (bytes32)",
  "function count() view returns (uint256)"
];

export const POLICY_ABI = [
  "function whitelisted(address) view returns (bool)",
  "function holderCap(address) view returns (uint256)"
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

export const SHORT = (addr: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—");
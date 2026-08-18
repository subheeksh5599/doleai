// Runtime configuration. All values come from NEXT_PUBLIC_* env vars. These must
// be referenced with STATIC string keys (process.env.NEXT_PUBLIC_X) so the
// bundler can statically substitute them into the client bundle — dynamic access
// (process.env[name]) is NOT inlined in the browser and would come up empty.
// Each read falls back to a safe default rather than throwing, so a page always
// renders; server API routes validate the values they need on each call.

export const config = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "",
  poolAddress: process.env.NEXT_PUBLIC_POOL_ADDRESS || "",
  paymentToken: process.env.NEXT_PUBLIC_PAYMENT_TOKEN || "",
  agentAddress: process.env.NEXT_PUBLIC_AGENT_ADDRESS || "",
  explorerApi: process.env.NEXT_PUBLIC_EXPLORER_API || "",
  explorerBase: process.env.NEXT_PUBLIC_EXPLORER_BASE || "",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 677,
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
  "function distribute(uint256 grossAmount, uint256 cycleId, bytes32 attestationUid)",
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
  "function record(address pool, uint256 cycleId, uint256 grossAmount, bytes32 evidenceHash, string sourceRef) returns (bytes32 uid)",
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
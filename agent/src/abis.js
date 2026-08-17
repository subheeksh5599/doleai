// Minimal ABIs for AttestPay contracts + platform tokens. Addresses are
// ALWAYS runtime config (env), never hardcoded here.

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
  "function setAgent(address)",
  "function setPaused(bool)",
  "event Issue(address indexed investor, uint256 shares, uint256 paid)",
  "event Buy(address indexed investor, uint256 shares, uint256 paid)",
  "event Redeem(address indexed investor, uint256 sharesReturned, uint256 payout)",
  "event DistributionExecuted(uint256 indexed id, uint256 indexed cycleId, uint256 grossAmount, uint256 totalPaid, uint256 recipientCount, bytes32 attestationUid)"
];

export const ASSET_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address, uint256)",
  "function burn(address, uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function approve(address, uint256) returns (bool)"
];

export const ATTESTATION_ABI = [
  "function record(address pool, uint256 cycleId, uint256 grossAmount, bytes32 evidenceHash, string sourceRef) returns (bytes32 uid)",
  "function attestations(bytes32) view returns (bytes32 uid, address pool, uint256 cycleId, uint256 grossAmount, bytes32 evidenceHash, string sourceRef, address signer, uint256 blockNumber, uint256 timestamp)",
  "function count() view returns (uint256)"
];

export const POLICY_ABI = [
  "function whitelisted(address) view returns (bool)",
  "function holderCap(address) view returns (uint256)",
  "function isWhitelisted(address) view returns (bool)"
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];
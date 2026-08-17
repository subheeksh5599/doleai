import { JsonRpcProvider, Contract, formatUnits, formatEther } from "ethers";
import { config, POOL_ABI, ASSET_ABI, REGISTRY_ABI, POLICY_ABI, ERC20_ABI } from "./config";

let cache = { provider: null as JsonRpcProvider | null, pool: null as Contract | null, asset: null as Contract | null, registry: null as Contract | null, policy: null as Contract | null, token: null as Contract | null };

export function provider() {
  if (!cache.provider) cache.provider = new JsonRpcProvider(config.rpcUrl);
  return cache.provider;
}

export async function pool() {
  if (!cache.pool) cache.pool = new Contract(config.poolAddress, POOL_ABI, provider());
  return cache.pool;
}

export async function asset() {
  const p = await pool();
  const addr = await p.assetToken();
  if (!cache.asset) cache.asset = new Contract(addr, ASSET_ABI, provider());
  return cache.asset;
}

export async function registry() {
  const p = await pool();
  const addr = await p.attestationRegistry();
  if (!cache.registry) cache.registry = new Contract(addr, REGISTRY_ABI, provider());
  return cache.registry;
}

export async function policy() {
  const p = await pool();
  const addr = await p.policyRegistry();
  if (!cache.policy) cache.policy = new Contract(addr, POLICY_ABI, provider());
  return cache.policy;
}

export async function token() {
  if (!cache.token) cache.token = new Contract(config.paymentToken, ERC20_ABI, provider());
  return cache.token;
}

export async function getPoolState() {
  const [p, ast, reg, pol, tok] = await Promise.all([pool(), asset(), registry(), policy(), token()]);
  const [paymentBalance, totalSupply, nextDist, holderCount, owner, agent, paused, attCount] = await Promise.all([
    p.paymentBalance(),
    ast.totalSupply(),
    p.nextDistId(),
    p.holderCount(),
    p.owner(),
    p.agent(),
    p.paused(),
    reg.count(),
  ]);
  const [tokenName, tokenSymbol, tokenDecimals, tokenBalance] = await Promise.all([
    tok.name(),
    tok.symbol(),
    tok.decimals(),
    tok.balanceOf(config.poolAddress),
  ]);
  const holders = [];
  for (let i = 0; i < Number(holderCount); i++) {
    const h = await p.holders(i);
    const [bal, whitelisted, cap] = await Promise.all([
      ast.balanceOf(h),
      pol.whitelisted(h),
      pol.holderCap(h),
    ]);
    if (bal > 0n)
      holders.push({
        address: h,
        balance: formatEther(bal),
        whitelisted,
        cap: cap === 0n ? null : formatEther(cap),
      });
  }
  // Distributions
  const dists = [];
  for (let i = 1; i < Number(nextDist); i++) {
    const d = await p.getDistribution(i);
    if (d.grossAmount === 0n) continue;
    dists.push({
      id: Number(d.id),
      cycleId: Number(d.cycleId),
      grossAmount: formatEther(d.grossAmount),
      totalPaid: formatEther(d.totalPaid),
      recipientCount: Number(d.recipientCount),
      timestamp: Number(d.timestamp) * 1000,
      attestationUid: d.attestationUid,
    });
  }
  // Attestations
  const atts = [];
  const n = Number(attCount);
  for (let i = 0; i < Math.min(n, 30); i++) {
    try {
      const uid = await reg.uids(i);
      const a = await reg.attestations(uid);
      atts.push({
        uid: a.uid,
        cycleId: Number(a.cycleId),
        grossAmount: formatEther(a.grossAmount),
        sourceRef: a.sourceRef,
        signer: a.signer,
        blockNumber: Number(a.blockNumber),
        timestamp: Number(a.timestamp) * 1000,
      });
    } catch {
      break;
    }
  }
  return {
    poolAddress: config.poolAddress,
    paymentBalance: formatEther(paymentBalance),
    totalSupply: formatEther(totalSupply),
    holderCount: Number(holderCount),
    owner,
    agent,
    paused,
    token: { name: tokenName, symbol: tokenSymbol, decimals: Number(tokenDecimals), poolBalance: formatUnits(tokenBalance, tokenDecimals) },
    holders,
    distributions: dists.reverse(),
    attestations: atts.reverse(),
  };
}
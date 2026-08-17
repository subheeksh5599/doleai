import { parseEther, formatEther, Contract, Wallet } from "ethers";
import { config, provider, agentWallet, ownerWallet } from "./config.js";
import { POOL_ABI, ERC20_ABI } from "./abis.js";
import { runCycle, onchainSnapshot, onboard, fundPool, wrapBOT, loadState } from "./flow.js";
import { poolContract } from "./flow.js";

const cmd = process.argv[2];
const args = process.argv.slice(3);

function log(o) {
  console.log(JSON.stringify(o, null, 2));
}

async function main() {
  switch (cmd) {
    case "status": {
      const snap = await onchainSnapshot();
      const pool = poolContract();
      const [distCount, agent, owner, paused] = await Promise.all([
        pool.nextDistId(),
        pool.agent(),
        pool.owner(),
        pool.paused(),
      ]);
      log({
        pool: config.pool,
        paymentBalanceWBOT: formatEther(snap.paymentBalance),
        totalSupplyDOLET: formatEther(snap.totalSupply),
        holders: snap.holders.map(h => ({ address: h.address, balance: formatEther(BigInt(h.balanceWei)) })),
        nextDistributionId: distCount.toString(),
        agent,
        owner,
        paused,
        attestationsRecorded: snap.attCount.toString(),
      });
      break;
    }
    case "run-cycle": {
      const dryRun = args.includes("--dry-run");
      const out = await runCycle({ dryRun });
      log(out);
      break;
    }
    case "onboard": {
      const addrs = args.filter(a => a.startsWith("0x"));
      if (!addrs.length) throw new Error("usage: onboard <address> [<address>...]");
      const res = await onboard(addrs);
      log(res);
      break;
    }
    case "buy": {
      const [addr, amountEth] = args;
      if (!addr || !amountEth) throw new Error("usage: buy <private-key> <amountWBOT>");
      const wallet = new Wallet(addr, provider());
      const pool = poolContract(wallet);
      const token = new Contract(config.paymentToken, ERC20_ABI, wallet);
      const amount = parseEther(amountEth);
      const approve = await token.approve(config.pool, amount);
      await approve.wait();
      const tx = await pool.buy(amount);
      const r = await tx.wait();
      log({ txHash: r.hash, blockNumber: r.blockNumber, amountWBOT: amountEth });
      break;
    }
    case "redeem": {
      const [addr, sharesEth] = args;
      if (!addr || !sharesEth) throw new Error("usage: redeem <private-key> <sharesDOLET>");
      const wallet = new Wallet(addr, provider());
      const pool = poolContract(wallet);
      const tx = await pool.redeem(parseEther(sharesEth));
      const r = await tx.wait();
      log({ txHash: r.hash, blockNumber: r.blockNumber, shares: sharesEth });
      break;
    }
    case "fund-pool": {
      const [pk, amountEth] = args;
      if (!pk || !amountEth) throw new Error("usage: fund-pool <private-key> <amountWBOT>");
      const res = await fundPool(parseEther(amountEth), pk);
      log(res);
      break;
    }
    case "wrap": {
      const [amountEth] = args;
      if (!amountEth) throw new Error("usage: wrap <amountBOT>");
      const res = await wrapBOT(parseEther(amountEth));
      log(res);
      break;
    }
    case "state": {
      log(loadState());
      break;
    }
    default:
      console.log(`DoleAI agent CLI
  status                on-chain pool state
  run-cycle [--dry-run] detect inflow -> verify -> attest -> distribute
  onboard <addr>...     whitelist accounts (owner)
  buy <pk> <amount>     investor purchase (WBOT -> DOLET)
  redeem <pk> <shares>  investor redemption (DOLET -> WBOT)
  fund-pool <pk> <amt>  real income: transfer WBOT into the pool
  wrap <amount>         wrap native BOT -> WBOT (agent wallet)
  state                 show agent state file`);
  }
}

main().catch(e => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
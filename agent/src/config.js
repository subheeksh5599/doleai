import "dotenv/config";
import { Wallet, JsonRpcProvider } from "ethers";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  rpc: required("RPC_URL"),
  pool: required("POOL_ADDRESS"),
  agentPk: required("AGENT_PK"),
  ownerPk: required("OWNER_PK"),
  paymentToken: required("PAYMENT_TOKEN"), // WBOT
  llm: {
    baseUrl: process.env.LLM_BASE_URL || "https://opencode.ai/zen/go/v1",
    key: process.env.LLM_API_KEY || null,
    model: process.env.LLM_MODEL || "deepseek-v4-flash",
  },
  // Real macro benchmark source (World Bank, keyless, updated Jul 2026):
  // US GDP growth (annual %) — the plausibility anchor for income inflows.
  benchmarkUrl:
    "https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=1",
  // Verification policy (env-tunable, no hardcoded thresholds in code).
  cycleDays: Number(process.env.VERIFY_CYCLE_DAYS || 1),
  minRatio: Number(process.env.VERIFY_MIN_RATIO || 0.25),
  maxRatio: Number(process.env.VERIFY_MAX_RATIO || 25),
  stateFile: process.env.AGENT_STATE_FILE || ".agent-state.json",
  rpcProvider: null,
};

export function provider() {
  if (!config.rpcProvider) config.rpcProvider = new JsonRpcProvider(config.rpc);
  return config.rpcProvider;
}

export function agentWallet() {
  return new Wallet(config.agentPk, provider());
}

export function ownerWallet() {
  return new Wallet(config.ownerPk, provider());
}
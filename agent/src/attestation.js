import { Contract, Wallet, verifyTypedData } from "ethers";
import { config, agentWallet, provider } from "./config.js";
import { ATTESTATION_ABI, POOL_ABI } from "./abis.js";

const ATTESTATION_TYPES = {
  Attestation: [
    { name: "pool", type: "address" },
    { name: "cycleId", type: "uint256" },
    { name: "grossAmount", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "sourceRef", type: "string" },
  ],
};

function domain(chainId, verifyingContract) {
  return {
    name: "AttestPay",
    version: "1",
    chainId,
    verifyingContract,
  };
}

export function attestationRegistry() {
  const pool = new Contract(config.pool, POOL_ABI, provider());
  // Read dynamically — never hardcode registry address.
  return null;
}

export async function registryAddress() {
  const pool = new Contract(config.pool, POOL_ABI, provider());
  return await pool.attestationRegistry();
}

export async function signAttestation({ cycleId, grossAmount, evidenceHash, sourceRef }) {
  const addr = await registryAddress();
  const chainId = (await provider().getNetwork()).chainId;
  const wallet = agentWallet();
  const signature = await wallet.signTypedData(
    domain(chainId, addr),
    ATTESTATION_TYPES,
    { pool: config.pool, cycleId, grossAmount, evidenceHash, sourceRef }
  );
  const recovered = verifyTypedData(
    domain(chainId, addr),
    ATTESTATION_TYPES,
    { pool: config.pool, cycleId, grossAmount, evidenceHash, sourceRef },
    signature
  );
  if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`signature recovery mismatch: ${recovered} != ${wallet.address}`);
  }
  return { signature, recoveredAddress: recovered, registry: addr };
}

export async function recordAttestation({ cycleId, grossAmount, evidenceHash, sourceRef, nonce }) {
  const { signature } = await signAttestation({ cycleId, grossAmount, evidenceHash, sourceRef });
  const addr = await registryAddress();
  const registry = new Contract(addr, ATTESTATION_ABI, agentWallet());
  const uid = await registry.record.staticCall(config.pool, cycleId, grossAmount, evidenceHash, sourceRef);
  const tx = await registry.record(config.pool, cycleId, grossAmount, evidenceHash, sourceRef, nonce === undefined ? {} : { nonce });
  const receipt = await tx.wait();
  return { uid, txHash: receipt.hash, blockNumber: receipt.blockNumber, signature };
}

export async function executeDistribution({ grossAmount, cycleId, attestationUid, nonce }) {
  const pool = new Contract(config.pool, POOL_ABI, agentWallet());
  const tx = await pool.distribute(grossAmount, cycleId, attestationUid, nonce === undefined ? {} : { nonce });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
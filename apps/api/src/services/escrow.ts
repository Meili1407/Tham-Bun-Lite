import "dotenv/config";
import { ethers } from "ethers";

export interface EscrowTransaction {
  txHash: string;
  contractCaseId?: number;
  contractAddress?: string;
}

const escrowAbi = [
  "event CaseCreated(uint256 indexed caseId, address indexed provider, uint256 targetAmount)",
  "function createCase(address provider, uint256 targetAmount) external returns (uint256 caseId)",
  "function fundCase(uint256 caseId) external payable",
  "function markTreatmentVerified(uint256 caseId) external",
  "function releaseToProvider(uint256 caseId) external"
] as const;

export async function createEscrowCase(providerWallet: string, targetAmount: number): Promise<EscrowTransaction> {
  const mode = getWeb3Mode();
  if (mode === "mock") {
    return createMockTransaction("create", String(targetAmount));
  }

  const { contract } = getTestnetClient();
  const tx = await contract.createCase(providerWallet, BigInt(targetAmount));
  const receipt = await tx.wait();
  const caseCreatedLog = receipt?.logs
    .map((log: unknown) => {
      try {
        return contract.interface.parseLog(log as ethers.Log);
      } catch {
        return null;
      }
    })
    .find((parsed: ethers.LogDescription | null) => parsed?.name === "CaseCreated");

  return {
    txHash: tx.hash,
    contractCaseId: caseCreatedLog ? Number(caseCreatedLog.args.caseId) : undefined,
    contractAddress: await contract.getAddress()
  };
}

export async function fundEscrowCase(contractCaseId: number, amountThb: number): Promise<EscrowTransaction> {
  const mode = getWeb3Mode();
  if (mode === "mock") {
    return createMockTransaction("fund", `${contractCaseId}:${amountThb}`);
  }

  const { contract } = getTestnetClient();
  const tx = await contract.fundCase(contractCaseId, { value: BigInt(amountThb) });
  await tx.wait();
  return {
    txHash: tx.hash,
    contractCaseId,
    contractAddress: await contract.getAddress()
  };
}

export async function markTreatmentVerifiedEscrowCase(contractCaseId: number): Promise<EscrowTransaction> {
  const mode = getWeb3Mode();
  if (mode === "mock") {
    return createMockTransaction("markTreatmentVerified", String(contractCaseId));
  }

  const { contract } = getTestnetClient();
  const tx = await contract.markTreatmentVerified(contractCaseId);
  await tx.wait();
  return {
    txHash: tx.hash,
    contractCaseId,
    contractAddress: await contract.getAddress()
  };
}

export async function releaseEscrowCase(contractCaseId: number): Promise<EscrowTransaction> {
  const mode = getWeb3Mode();
  if (mode === "mock") {
    return createMockTransaction("release", String(contractCaseId));
  }

  const { contract } = getTestnetClient();
  const tx = await contract.releaseToProvider(contractCaseId);
  await tx.wait();
  return {
    txHash: tx.hash,
    contractCaseId,
    contractAddress: await contract.getAddress()
  };
}

function getWeb3Mode(): "mock" | "testnet" {
  const mode = process.env.WEB3_MODE ?? "mock";
  if (mode !== "mock" && mode !== "testnet") {
    throw new Error(`Unsupported WEB3_MODE: ${mode}`);
  }

  return mode;
}

function createMockTransaction(action: string, input: string): EscrowTransaction {
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const contractCaseId = action === "create" ? Number(Date.now().toString().slice(-6)) : Number(input.split(":")[0]);

  return {
    txHash: ethers.keccak256(ethers.toUtf8Bytes(`${action}:${input}:${Date.now()}`)),
    contractCaseId,
    contractAddress
  };
}

function getTestnetClient(): { contract: ethers.Contract } {
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!contractAddress || !rpcUrl || !privateKey) {
    throw new Error("RPC_URL, PRIVATE_KEY, and ESCROW_CONTRACT_ADDRESS are required when WEB3_MODE=testnet.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, escrowAbi, signer);

  return { contract };
}

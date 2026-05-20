import "dotenv/config";
import { ethers } from "ethers";
import type { ThamBunCase } from "../types/case.js";

export interface EscrowTransaction {
  txHash: string;
  contractCaseId?: number;
  contractAddress?: string;
}

export async function createEscrowCase(thamBunCase: ThamBunCase): Promise<EscrowTransaction> {
  return simulateOrThrow("create", thamBunCase);
}

export async function fundEscrowCase(thamBunCase: ThamBunCase, amountThb: number): Promise<EscrowTransaction> {
  return simulateOrThrow("fund", thamBunCase, amountThb);
}

export async function releaseEscrowToProvider(thamBunCase: ThamBunCase): Promise<EscrowTransaction> {
  return simulateOrThrow("release", thamBunCase);
}

async function simulateOrThrow(action: string, thamBunCase: ThamBunCase, amountThb = 0): Promise<EscrowTransaction> {
  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!contractAddress || !rpcUrl || !privateKey) {
    return {
      txHash: ethers.keccak256(ethers.toUtf8Bytes(`${action}:${thamBunCase.id}:${amountThb}:${Date.now()}`)),
      contractCaseId: thamBunCase.contractCaseId ?? Number(thamBunCase.id.replace("case_", "")),
      contractAddress: contractAddress ?? "0x0000000000000000000000000000000000000000"
    };
  }

  throw new Error("Real escrow contract calls are not wired yet. Add ABI calls in apps/api/src/services/escrow.ts.");
}

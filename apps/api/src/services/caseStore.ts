import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ThamBunCase } from "../types/case.js";

export type CreateCaseInput = Omit<ThamBunCase, "id">;

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const dataDir = path.resolve(currentDir, "../../data");
const caseStorePath = path.join(dataDir, "cases.json");

const seedCases: ThamBunCase[] = [
  {
    id: "case_001",
    requesterLineId: "U123456789",
    title: "Emergency treatment for injured stray dog",
    providerName: "Happy Paw Vet Clinic",
    providerWallet: process.env.CLINIC_WALLET_ADDRESS ?? "0x1111111111111111111111111111111111111111",
    amountNeeded: 3200,
    amountRaised: 0,
    trustScore: 87,
    fraudRisk: "low",
    status: "FUNDING",
    billImageUrl: "/uploads/bill.jpg",
    animalImageUrl: "/uploads/dog.jpg",
    validation: {
      isValidBill: true,
      clinicName: "Happy Paw Vet Clinic",
      detectedAmountThb: 3200,
      detectedDate: "20/05/2026",
      fraudRisk: "low",
      trustScore: 87,
      redFlags: [],
      reason: "Seeded demo case for the hackathon flow.",
      rawOcrText: "Happy Paw Vet Clinic invoice amount 3200 THB date 20/05/2026"
    }
  }
];

export async function ensureCaseStore(): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(caseStorePath, "utf8");
  } catch {
    await writeCases(seedCases);
  }
}

export async function listCases(): Promise<ThamBunCase[]> {
  return readCases();
}

export async function getCase(id: string): Promise<ThamBunCase | undefined> {
  const cases = await readCases();
  return cases.find((thamBunCase) => thamBunCase.id === id);
}

export async function createCase(data: CreateCaseInput): Promise<ThamBunCase> {
  const cases = await readCases();
  const nextId = `case_${String(cases.length + 1).padStart(3, "0")}`;
  const newCase: ThamBunCase = {
    ...data,
    id: nextId
  };

  cases.push(newCase);
  await writeCases(cases);
  return newCase;
}

export async function updateCase(id: string, patch: Partial<ThamBunCase>): Promise<ThamBunCase | undefined> {
  const cases = await readCases();
  const index = cases.findIndex((thamBunCase) => thamBunCase.id === id);

  if (index === -1) {
    return undefined;
  }

  const updated = { ...cases[index], ...patch };
  cases[index] = updated;
  await writeCases(cases);
  return updated;
}

async function readCases(): Promise<ThamBunCase[]> {
  await ensureCaseStore();
  const raw = await readFile(caseStorePath, "utf8");
  const cases = JSON.parse(raw) as ThamBunCase[];

  return cases.map((thamBunCase) => {
    if (thamBunCase.providerName !== "Happy Paw Vet Clinic") {
      return thamBunCase;
    }

    return {
      ...thamBunCase,
      providerWallet: process.env.CLINIC_WALLET_ADDRESS ?? thamBunCase.providerWallet
    };
  });
}

async function writeCases(cases: ThamBunCase[]): Promise<void> {
  await writeFile(caseStorePath, `${JSON.stringify(cases, null, 2)}\n`, "utf8");
}

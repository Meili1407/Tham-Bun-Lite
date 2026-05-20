import type { ThamBunCase } from "../types/case.js";

const cases = new Map<string, ThamBunCase>();

export function listCases(): ThamBunCase[] {
  return [...cases.values()];
}

export function getCase(id: string): ThamBunCase | undefined {
  return cases.get(id);
}

export function createCase(input: Omit<ThamBunCase, "id" | "amountRaised" | "trustScore" | "fraudRisk" | "status">): ThamBunCase {
  const id = `case_${String(cases.size + 1).padStart(3, "0")}`;
  const newCase: ThamBunCase = {
    ...input,
    id,
    amountRaised: 0,
    trustScore: 0,
    fraudRisk: "medium",
    status: "DRAFT"
  };

  cases.set(id, newCase);
  return newCase;
}

export function updateCase(id: string, patch: Partial<ThamBunCase>): ThamBunCase | undefined {
  const existing = cases.get(id);
  if (!existing) {
    return undefined;
  }

  const updated = { ...existing, ...patch };
  cases.set(id, updated);
  return updated;
}

createCase({
  requesterLineId: "demo_line_user",
  title: "Emergency treatment for injured stray dog",
  providerName: "Happy Paw Vet Clinic",
  providerWallet: "0x1111111111111111111111111111111111111111",
  amountNeeded: 3200,
  billImageUrl: "/uploads/bill.jpg",
  animalImageUrl: "/uploads/dog.jpg"
});

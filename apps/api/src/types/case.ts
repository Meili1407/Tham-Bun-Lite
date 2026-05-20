export type CaseStatus =
  | "DRAFT"
  | "WAITING_FOR_BILL"
  | "WAITING_FOR_ANIMAL_PHOTO"
  | "WAITING_FOR_AI"
  | "VERIFIED"
  | "REJECTED"
  | "FUNDING"
  | "FUNDED"
  | "TREATMENT_SUBMITTED"
  | "TREATMENT_VERIFIED"
  | "RELEASED";

export type FraudRisk = "low" | "medium" | "high";

export interface ValidationResult {
  isValidBill: boolean;
  clinicName: string;
  detectedAmountThb: number | null;
  detectedDate: string | null;
  fraudRisk: FraudRisk;
  trustScore: number;
  redFlags: string[];
  reason: string;
  rawOcrText?: string;
}

export interface ThamBunCase {
  id: string;
  requesterLineId: string;
  title: string;
  providerName: string;
  providerWallet: string;
  amountNeeded: number;
  amountRaised: number;
  trustScore: number;
  fraudRisk: FraudRisk;
  status: CaseStatus;
  billImageUrl?: string;
  animalImageUrl?: string;
  treatmentProofUrl?: string;
  contractCaseId?: number;
  contractAddress?: string;
  createdTxHash?: string;
  fundedTxHash?: string;
  releaseTxHash?: string;
  validation?: ValidationResult;
}

import type { FraudRisk, ValidationResult } from "../types/case.js";
import { findProviderByName } from "./providerRegistry.js";

export interface ValidateCaseInput {
  billImageUrl: string;
  animalImageUrl?: string;
  ocrText?: string;
}

const defaultDemoOcrText = "Happy Paw Vet Clinic invoice amount 3200 THB date 20/05/2026";

export async function validateCaseEvidence(input: ValidateCaseInput): Promise<ValidationResult> {
  const rawOcrText = await extractOcrText(input);
  const provider = findProviderByName(rawOcrText);
  const detectedAmountThb = detectAmountThb(rawOcrText);
  const detectedDate = detectDate(rawOcrText);
  const redFlags: string[] = [];

  let trustScore = 50;

  if (provider?.verified) {
    trustScore += 25;
  } else {
    trustScore -= 25;
    redFlags.push("Clinic is not in the verified provider registry.");
  }

  if (detectedAmountThb !== null) {
    trustScore += 15;
  } else {
    trustScore -= 20;
    redFlags.push("Treatment amount could not be detected.");
  }

  if (detectedDate !== null) {
    trustScore += 10;
  } else {
    trustScore -= 15;
    redFlags.push("Bill date could not be detected.");
  }

  if (input.animalImageUrl) {
    trustScore += 10;
  } else {
    redFlags.push("Animal photo is missing.");
  }

  trustScore = Math.max(0, Math.min(100, trustScore));
  const fraudRisk = riskFromScore(trustScore);

  return {
    isValidBill: Boolean(provider?.verified && detectedAmountThb),
    clinicName: provider?.name ?? "Unknown provider",
    detectedAmountThb,
    detectedDate,
    fraudRisk,
    trustScore,
    redFlags,
    reason: redFlags.length === 0 ? "Bill matches a verified provider and required fields were detected." : redFlags.join(" "),
    rawOcrText
  };
}

async function extractOcrText(input: ValidateCaseInput): Promise<string> {
  if (input.ocrText) {
    return input.ocrText;
  }

  const mode = process.env.VALIDATOR_MODE ?? "mock";

  if (mode === "mock") {
    return defaultDemoOcrText;
  }

  if (mode !== "tesseract") {
    throw new Error(`Unsupported VALIDATOR_MODE: ${mode}`);
  }

  const tesseractModule = (await import("tesseract.js")) as {
    recognize?: (image: string, languages?: string) => Promise<{ data: { text: string } }>;
    default?: {
      recognize: (image: string, languages?: string) => Promise<{ data: { text: string } }>;
    };
  };
  const recognize = tesseractModule.recognize ?? tesseractModule.default?.recognize;
  if (!recognize) {
    throw new Error("Tesseract recognize() is unavailable.");
  }
  const result = await recognize(input.billImageUrl, "eng");
  return sanitizeOcrText(result.data.text);
}

function detectAmountThb(text: string): number | null {
  const match = text.match(/(?:amount\s*)?([\d,]+)\s*(?:THB|baht)/i);
  if (!match) {
    return null;
  }

  return Number(match[1].replace(/,/g, ""));
}

function detectDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
  return match?.[1] ?? null;
}

function sanitizeOcrText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function riskFromScore(score: number): FraudRisk {
  if (score >= 80) {
    return "low";
  }

  if (score >= 60) {
    return "medium";
  }

  return "high";
}

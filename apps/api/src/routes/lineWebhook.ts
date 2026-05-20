import { Router } from "express";
import { createCase, getCase, listCases, updateCase } from "../services/caseStore.js";
import { createEscrowCase } from "../services/escrow.js";
import { replyText } from "../services/lineClient.js";
import { findProviderByName } from "../services/providerRegistry.js";
import { validateCaseEvidence } from "../services/validator.js";

export const lineWebhookRouter = Router();

type SessionState =
  | {
      step: "IDLE";
    }
  | {
      step: "WAITING_FOR_BILL";
    }
  | {
      step: "WAITING_FOR_ANIMAL_PHOTO";
      billImageUrl: string;
    }
  | {
      step: "WAITING_FOR_TREATMENT_PROOF";
      caseId?: string;
    };

interface LineEvent {
  replyToken?: string;
  source?: {
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
    id?: string;
    contentProvider?: {
      originalContentUrl?: string;
    };
  };
}

const sessions = new Map<string, SessionState>();

lineWebhookRouter.post("/", async (req, res, next) => {
  const events = Array.isArray(req.body?.events) ? (req.body.events as LineEvent[]) : [];

  try {
    for (const event of events) {
      await handleLineEvent(event);
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

async function handleLineEvent(event: LineEvent): Promise<void> {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken || !event.message?.type) {
    return;
  }

  const state = sessions.get(userId) ?? { step: "IDLE" };

  if (event.message.type === "text") {
    await handleTextCommand(userId, replyToken, state, event.message.text ?? "");
    return;
  }

  if (event.message.type === "image") {
    await handleImageUpload(userId, replyToken, state, event);
  }
}

async function handleTextCommand(userId: string, replyToken: string, state: SessionState, text: string): Promise<void> {
  const command = text.trim().toLowerCase();

  if (command === "/newcase") {
    sessions.set(userId, { step: "WAITING_FOR_BILL" });
    await replyText(replyToken, "Please upload vet bill or treatment estimate.");
    return;
  }

  if (command === "/submit-treatment") {
    sessions.set(userId, { step: "WAITING_FOR_TREATMENT_PROOF" });
    await replyText(replyToken, "Please upload final treatment receipt or treatment photo.");
    return;
  }

  if (command === "/status") {
    const latestCase = await findLatestCaseForUser(userId);

    if (!latestCase) {
      await replyText(replyToken, "No case found yet. Send /newcase to start a case.");
      return;
    }

    const txHash = latestCase.releaseTxHash ?? latestCase.fundedTxHash ?? latestCase.createdTxHash ?? "Pending";
    await replyText(
      replyToken,
      [
        `Case: ${latestCase.title}`,
        `Status: ${latestCase.status}`,
        `Raised: ${latestCase.amountRaised}/${latestCase.amountNeeded} THB`,
        `Trust Score: ${latestCase.trustScore}`,
        `Fraud Risk: ${latestCase.fraudRisk}`,
        `Campaign: ${buildCampaignLink(latestCase.id)}`,
        `Transaction: ${txHash}`
      ].join("\n")
    );
    return;
  }

  if (state.step === "WAITING_FOR_BILL" || state.step === "WAITING_FOR_ANIMAL_PHOTO" || state.step === "WAITING_FOR_TREATMENT_PROOF") {
    await replyText(replyToken, "Please send the requested image upload to continue.");
    return;
  }

  await replyText(replyToken, "Commands: /newcase, /status, /submit-treatment");
}

async function handleImageUpload(userId: string, replyToken: string, state: SessionState, event: LineEvent): Promise<void> {
  const imageUrl = extractImageUrl(event);

  if (state.step === "WAITING_FOR_BILL") {
    sessions.set(userId, {
      step: "WAITING_FOR_ANIMAL_PHOTO",
      billImageUrl: imageUrl
    });
    await replyText(replyToken, "Bill received. Please upload animal photo.");
    return;
  }

  if (state.step === "WAITING_FOR_ANIMAL_PHOTO") {
    const provider = findProviderByName("Happy Paw Vet Clinic");
    if (!provider) {
      throw new Error("Verified provider is not configured.");
    }

    const validation = await validateCaseEvidence({
      billImageUrl: state.billImageUrl,
      animalImageUrl: imageUrl
    });
    const newCase = await createCase({
      requesterLineId: userId,
      title: "Emergency treatment for injured stray dog",
      providerName: provider.name,
      providerWallet: provider.wallet,
      amountNeeded: validation.detectedAmountThb ?? 3200,
      amountRaised: 0,
      trustScore: validation.trustScore,
      fraudRisk: validation.fraudRisk,
      status: validation.isValidBill ? "FUNDING" : "REJECTED",
      billImageUrl: state.billImageUrl,
      animalImageUrl: imageUrl,
      validation
    });
    const escrowTx = await createEscrowCase(newCase.providerWallet, newCase.amountNeeded);
    const updatedCase = await updateCase(newCase.id, {
      contractCaseId: escrowTx.contractCaseId,
      contractAddress: escrowTx.contractAddress,
      createdTxHash: escrowTx.txHash
    });

    sessions.set(userId, { step: "IDLE" });

    const resolvedCase = updatedCase ?? newCase;
    await replyText(
      replyToken,
      [
        "Case verification complete.",
        "",
        `Clinic: ${resolvedCase.providerName}`,
        `Amount: ${resolvedCase.amountNeeded} THB`,
        `Trust Score: ${resolvedCase.trustScore}/100`,
        `Fraud Risk: ${capitalize(resolvedCase.fraudRisk)}`,
        "",
        `Campaign link: ${buildCampaignLink(resolvedCase.id)}`
      ].join("\n")
    );
    return;
  }

  if (state.step === "WAITING_FOR_TREATMENT_PROOF") {
    const latestCase = state.caseId ? await getCase(state.caseId) : await findLatestCaseForUser(userId);

    if (!latestCase?.id) {
      sessions.set(userId, { step: "IDLE" });
      await replyText(replyToken, "No active case found. Send /status to inspect your latest case.");
      return;
    }

    const response = await fetch(`${resolveInternalApiBaseUrl()}/api/cases/${latestCase.id}/verify-treatment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentProofImageUrl: imageUrl
      })
    });
    const payload = (await response.json()) as {
      case?: { status?: string; releaseTxHash?: string };
      txHash?: string;
      error?: string;
    };

    sessions.set(userId, { step: "IDLE" });

    if (!response.ok) {
      await replyText(replyToken, payload.error ?? "Treatment verification failed.");
      return;
    }

    await replyText(
      replyToken,
      [
        `Treatment status: ${payload.case?.status ?? "RELEASED"}`,
        `Release tx: ${payload.txHash ?? payload.case?.releaseTxHash ?? "Pending"}`
      ].join("\n")
    );
    return;
  }

  await replyText(replyToken, "Send /newcase to begin a case or /submit-treatment to submit final proof.");
}

async function findLatestCaseForUser(userId: string) {
  const cases = await listCases();

  return [...cases]
    .reverse()
    .find((thamBunCase) => thamBunCase.requesterLineId === userId);
}

function extractImageUrl(event: LineEvent): string {
  const contentUrl = event.message?.contentProvider?.originalContentUrl;
  if (contentUrl) {
    return contentUrl;
  }

  return `/line/media/${event.message?.id ?? Date.now()}`;
}

function resolveApiBaseUrl(): string {
  return process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
}

function resolveInternalApiBaseUrl(): string {
  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

function buildCampaignLink(caseId: string): string {
  return `${resolveApiBaseUrl()}/case/${caseId}`;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

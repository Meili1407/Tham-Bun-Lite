import { Router } from "express";
import { createCase, getCase, listCases, updateCase } from "../services/caseStore.js";
import { createEscrowCase, fundEscrowCase, releaseEscrowToProvider } from "../services/escrow.js";
import { findProviderByName } from "../services/providerRegistry.js";
import { validateCaseEvidence } from "../services/validator.js";

export const casesRouter = Router();

casesRouter.get("/", (_req, res) => {
  res.json({ cases: listCases() });
});

casesRouter.get("/:id", (req, res) => {
  const thamBunCase = getCase(req.params.id);

  if (!thamBunCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(thamBunCase);
});

casesRouter.post("/", async (req, res, next) => {
  try {
    const providerName = String(req.body.providerName ?? "");
    const provider = findProviderByName(providerName);

    if (!provider) {
      res.status(400).json({ error: "Unknown provider" });
      return;
    }

    const newCase = createCase({
      requesterLineId: String(req.body.requesterLineId ?? "demo_line_user"),
      title: String(req.body.title ?? "Emergency treatment case"),
      providerName: provider.name,
      providerWallet: provider.wallet,
      amountNeeded: Number(req.body.amountNeeded ?? 0),
      billImageUrl: req.body.billImageUrl,
      animalImageUrl: req.body.animalImageUrl
    });

    const validation = await validateCaseEvidence({
      billImageUrl: newCase.billImageUrl ?? "",
      animalImageUrl: newCase.animalImageUrl,
      ocrText: req.body.ocrText
    });
    const escrowTx = await createEscrowCase(newCase);
    const updated = updateCase(newCase.id, {
      providerName: validation.clinicName,
      amountNeeded: validation.detectedAmountThb ?? newCase.amountNeeded,
      trustScore: validation.trustScore,
      fraudRisk: validation.fraudRisk,
      status: validation.isValidBill ? "FUNDING" : "REJECTED",
      validation,
      contractCaseId: escrowTx.contractCaseId,
      contractAddress: escrowTx.contractAddress,
      createdTxHash: escrowTx.txHash
    });

    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:id/donate", async (req, res, next) => {
  try {
    const thamBunCase = getCase(req.params.id);
    const amountThb = Number(req.body.amountThb ?? 0);

    if (!thamBunCase) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    if (amountThb <= 0) {
      res.status(400).json({ error: "amountThb must be greater than 0" });
      return;
    }

    const tx = await fundEscrowCase(thamBunCase, amountThb);
    const amountRaised = thamBunCase.amountRaised + amountThb;
    const updated = updateCase(thamBunCase.id, {
      amountRaised,
      status: amountRaised >= thamBunCase.amountNeeded ? "FUNDED" : "FUNDING",
      fundedTxHash: tx.txHash
    });

    res.json({ success: true, case: updated, txHash: tx.txHash });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:id/verify-treatment", async (req, res, next) => {
  try {
    const thamBunCase = getCase(req.params.id);

    if (!thamBunCase) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const treatmentProofUrl = String(req.body.treatmentProofImageUrl ?? "");
    if (!treatmentProofUrl) {
      res.status(400).json({ error: "treatmentProofImageUrl is required" });
      return;
    }

    const releaseTx = await releaseEscrowToProvider(thamBunCase);
    const updated = updateCase(thamBunCase.id, {
      treatmentProofUrl,
      status: "RELEASED",
      releaseTxHash: releaseTx.txHash
    });

    res.json({ success: true, case: updated, txHash: releaseTx.txHash });
  } catch (error) {
    next(error);
  }
});

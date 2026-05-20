import { Router } from "express";
import { getCase, updateCase } from "../services/caseStore.js";
import { createEscrowCase, fundEscrowCase, markTreatmentVerifiedEscrowCase, releaseEscrowCase } from "../services/escrow.js";

export const casesRouter = Router();
casesRouter.get("/:id", async (req, res) => {
  const thamBunCase = await getCase(req.params.id);

  if (!thamBunCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(thamBunCase);
});

casesRouter.post("/:id/donate", async (req, res, next) => {
  try {
    const thamBunCase = await getCase(req.params.id);
    const amountThb = Number(req.body.amountThb ?? 0);

    if (!thamBunCase) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    if (amountThb <= 0) {
      res.status(400).json({ error: "amountThb must be greater than 0" });
      return;
    }

    let contractCaseId = thamBunCase.contractCaseId;
    let contractAddress = thamBunCase.contractAddress;
    let createdTxHash = thamBunCase.createdTxHash;

    if (!contractCaseId) {
      const creation = await createEscrowCase(thamBunCase.providerWallet, thamBunCase.amountNeeded);
      contractCaseId = creation.contractCaseId;
      contractAddress = creation.contractAddress;
      createdTxHash = creation.txHash;
    }

    if (!contractCaseId) {
      throw new Error("Escrow case ID was not returned.");
    }

    const tx = await fundEscrowCase(contractCaseId, amountThb);
    const nextAmountRaised = thamBunCase.amountRaised + amountThb;
    const updated = await updateCase(thamBunCase.id, {
      contractCaseId,
      contractAddress,
      createdTxHash,
      amountRaised: nextAmountRaised,
      status: nextAmountRaised >= thamBunCase.amountNeeded ? "FUNDED" : "FUNDING",
      fundedTxHash: tx.txHash
    });

    res.json({ success: true, case: updated, txHash: tx.txHash });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:id/verify-treatment", async (req, res, next) => {
  try {
    const thamBunCase = await getCase(req.params.id);

    if (!thamBunCase) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const treatmentProofUrl = String(req.body.treatmentProofImageUrl ?? "");
    if (!treatmentProofUrl) {
      res.status(400).json({ error: "treatmentProofImageUrl is required" });
      return;
    }

    if (!thamBunCase.contractCaseId) {
      throw new Error("Case does not have an escrow contract ID yet.");
    }

    await updateCase(thamBunCase.id, {
      treatmentProofUrl,
      status: "TREATMENT_SUBMITTED"
    });

    await markTreatmentVerifiedEscrowCase(thamBunCase.contractCaseId);
    const releaseTx = await releaseEscrowCase(thamBunCase.contractCaseId);
    const updated = await updateCase(thamBunCase.id, {
      treatmentProofUrl,
      status: "RELEASED",
      releaseTxHash: releaseTx.txHash
    });

    res.json({ success: true, case: updated, txHash: releaseTx.txHash });
  } catch (error) {
    next(error);
  }
});

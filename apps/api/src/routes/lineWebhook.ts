import { Router } from "express";

export const lineWebhookRouter = Router();

// Antigravity owns the LINE conversation UX in this file.
lineWebhookRouter.post("/", (req, res) => {
  console.log("LINE webhook event received", req.body);
  res.json({ ok: true });
});

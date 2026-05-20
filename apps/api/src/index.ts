import cors from "cors";
import "dotenv/config";
import express from "express";
import { casesRouter } from "./routes/cases.js";
import { lineWebhookRouter } from "./routes/lineWebhook.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tham-bun-api" });
});

app.use("/api/cases", casesRouter);
app.use("/webhook", lineWebhookRouter);

app.listen(port, () => {
  console.log(`Tham Bun API listening on http://localhost:${port}`);
});

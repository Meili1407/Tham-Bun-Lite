import cors from "cors";
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { casesRouter } from "./routes/cases.js";
import { lineWebhookRouter } from "./routes/lineWebhook.js";
import { ensureCaseStore } from "./services/caseStore.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "tham-bun-api" });
});

app.use("/api/cases", casesRouter);
app.use("/webhook", lineWebhookRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(500).json({ error: message });
});

async function start() {
  await ensureCaseStore();

  app.listen(port, () => {
    console.log(`Tham Bun API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import { config } from "./config";
import { router } from "./api";
import { startStream } from "./stream";
import { restoreRules } from "./rules";

async function main() {
  const app = express();

  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use("/api", router);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port}`);
  });

  // Restore any rules from DB that may have been lost
  await restoreRules();

  // Start the persistent stream consumer
  startStream();
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});

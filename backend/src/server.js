const { app } = require("./app");
const { config } = require("./config");
const { shutdownAiWorker, warmupAiWorker } = require("./services/ai.service");

const server = app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log("AI recognition: Python worker with PaddleOCR");
  warmupAiWorker().catch((error) => {
    console.warn("[ai] Worker warmup failed:", error.message);
  });
});

function gracefulShutdown() {
  shutdownAiWorker();
  server.close(() => process.exit(0));
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

const { app } = require("./app");
const { config } = require("./config");
const { warmupAiWorker, shutdownAiWorker } = require("./services/ai.service");

const server = app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);

  if (config.aiUseWorker) {
    warmupAiWorker()
      .then(() => {
        console.log("AI worker ready (models loaded in memory).");
      })
      .catch((error) => {
        console.warn(
          "AI worker warmup failed; requests will retry or use one-shot script:",
          error.message
        );
      });
  }
});

function gracefulShutdown() {
  shutdownAiWorker();
  server.close(() => process.exit(0));
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

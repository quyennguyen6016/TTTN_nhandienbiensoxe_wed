const { app } = require("./app");
const { config } = require("./config");

const server = app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log("AI recognition: Manual batch processing via Python");
});

function gracefulShutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
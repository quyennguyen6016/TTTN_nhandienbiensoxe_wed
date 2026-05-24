const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");

const config = {
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
  pythonExecutable: process.env.PYTHON_EXECUTABLE || "python",
  aiScriptPath: path.resolve(
    backendRoot,
    process.env.AI_SCRIPT_PATH || "../recognize_image.py"
  ),
  aiWorkerScriptPath: path.resolve(
    backendRoot,
    process.env.AI_WORKER_SCRIPT_PATH || "../ai_worker.py"
  ),
  aiUseWorker: process.env.AI_USE_WORKER !== "false",
  uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || "uploads/original"),
  annotatedDir: path.resolve(
    backendRoot,
    process.env.ANNOTATED_DIR || "uploads/annotated"
  ),
  backendRoot,
  projectRoot,
};

module.exports = { config };

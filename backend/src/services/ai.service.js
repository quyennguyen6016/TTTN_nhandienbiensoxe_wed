const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const { config } = require("../config");

const WORKER_REQUEST_TIMEOUT_MS = Number(process.env.AI_WORKER_TIMEOUT_MS || 120000);

function pythonSpawnOptions() {
  return {
    cwd: config.projectRoot,
    windowsHide: true,
  };
}

class AiWorkerClient {
  constructor() {
    this.process = null;
    this.buffer = "";
    this.ready = false;
    this.readyPromise = null;
    this.resolveReady = null;
    this.rejectReady = null;
    this.pending = new Map();
    this.shuttingDown = false;
  }

  start() {
    if (this.ready) {
      return Promise.resolve();
    }
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;

      this.process = spawn(
        config.pythonExecutable,
        ["-m", config.aiWorkerModule],
        {
          stdio: ["pipe", "pipe", "pipe"],
          ...pythonSpawnOptions(),
        }
      );

      this.process.stdout.on("data", (chunk) => {
        this.handleStdout(chunk.toString());
      });

      this.process.stderr.on("data", (chunk) => {
        const message = chunk.toString().trim();
        if (message) {
          console.warn("[ai-worker]", message);
        }
      });

      this.process.on("error", (error) => {
        this.failAllPending(error);
        if (!this.ready && this.rejectReady) {
          this.rejectReady(error);
        }
      });

      this.process.on("close", (code) => {
        const error = new Error(`AI worker exited with code ${code ?? "unknown"}`);
        this.failAllPending(error);
        if (!this.ready && this.rejectReady) {
          this.rejectReady(error);
        }
        this.resetState();
      });
    });

    return this.readyPromise;
  }

  resetState() {
    this.process = null;
    this.buffer = "";
    this.ready = false;
    this.readyPromise = null;
    this.resolveReady = null;
    this.rejectReady = null;
    this.pending.clear();
  }

  markReady() {
    if (this.ready) {
      return;
    }
    this.ready = true;
    if (this.resolveReady) {
      this.resolveReady();
      this.resolveReady = null;
      this.rejectReady = null;
    }
  }

  failAllPending(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  handleStdout(chunk) {
    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf("\n");

    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      newlineIndex = this.buffer.indexOf("\n");

      if (!line) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        console.warn("[ai-worker] Invalid JSON:", line);
        continue;
      }

      if (message.type === "ready") {
        this.markReady();
        return;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        continue;
      }

      clearTimeout(pending.timeout);
      this.pending.delete(message.id);

      if (!message.success) {
        pending.resolve({
          success: false,
          message: message.message || "No plate detected.",
        });
        return;
      }

      pending.resolve({ success: true, data: message.data });
    }
  }

  async recognize(imagePath, annotatedPath) {
    if (this.shuttingDown) {
      throw new Error("AI worker is shutting down.");
    }

    await this.start();

    if (!this.process?.stdin.writable) {
      throw new Error("AI worker stdin is not writable.");
    }

    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("AI worker request timed out."));
      }, WORKER_REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timeout });

      const payload = JSON.stringify({
        id,
        image_path: imagePath,
        annotated_path: annotatedPath,
      });

      this.process.stdin.write(`${payload}\n`, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  shutdown() {
    this.shuttingDown = true;
    this.failAllPending(new Error("AI worker stopped."));
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
    this.resetState();
    this.shuttingDown = false;
  }
}

const workerClient = new AiWorkerClient();

function buildAnnotatedPath(imagePath) {
  const ext = path.extname(imagePath) || ".jpg";
  return path.resolve(
    config.annotatedDir,
    `${path.basename(imagePath, ext)}-annotated${ext}`
  );
}

function recognizeImageOnce(imagePath, annotatedPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.pythonExecutable,
      ["-m", config.aiRecognizeModule, imagePath, "--save-annotated", annotatedPath],
      pythonSpawnOptions()
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        const error = new Error(stderr || `AI script exited with code ${code}`);
        error.statusCode = 502;
        return reject(error);
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.success) {
          return resolve({
            success: false,
            message: parsed.message || "No plate detected.",
          });
        }
        return resolve({ success: true, data: parsed.data });
      } catch (error) {
        error.statusCode = 502;
        error.message = `Invalid AI script response: ${stdout}`;
        return reject(error);
      }
    });
  });
}

async function recognizeImage(imagePath) {
  const annotatedPath = buildAnnotatedPath(imagePath);

  if (!config.aiUseWorker) {
    const result = await recognizeImageOnce(imagePath, annotatedPath);
    return result.success
      ? { ...result, annotatedPath }
      : result;
  }

  try {
    const result = await workerClient.recognize(imagePath, annotatedPath);
    return result.success
      ? { ...result, annotatedPath }
      : result;
  } catch (error) {
    console.warn("[ai] Worker failed, falling back to one-shot script:", error.message);
    const result = await recognizeImageOnce(imagePath, annotatedPath);
    return result.success
      ? { ...result, annotatedPath }
      : result;
  }
}

async function warmupAiWorker() {
  if (!config.aiUseWorker) {
    return;
  }
  await workerClient.start();
}

function shutdownAiWorker() {
  workerClient.shutdown();
}

module.exports = {
  recognizeImage,
  warmupAiWorker,
  shutdownAiWorker,
};

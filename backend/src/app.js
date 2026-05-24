const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { config } = require("./config");
const { errorHandler } = require("./middleware/error-handler");
const healthRoutes = require("./routes/health.routes");
const recognitionRoutes = require("./routes/recognition.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const ownerRoutes = require("./routes/owner.routes");
const cameraRoutes = require("./routes/camera.routes");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.resolve(config.backendRoot, "uploads")));

app.use("/health", healthRoutes);
app.use("/api/recognitions", recognitionRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/cameras", cameraRoutes);

app.use(errorHandler);

module.exports = { app };

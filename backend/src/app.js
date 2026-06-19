const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { config } = require("./config");
const { errorHandler } = require("./middleware/error-handler");
const { authenticate, adminOnly, userOrAdmin } = require("./middleware/auth.middleware");

const healthRoutes      = require("./routes/health.routes");
const authRoutes        = require("./routes/auth.routes");
const recognitionRoutes = require("./routes/recognition.routes");
const vehicleRoutes     = require("./routes/vehicle.routes");
const ownerRoutes       = require("./routes/owner.routes");
const cameraRoutes      = require("./routes/camera.routes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.resolve(config.backendRoot, "uploads")));

// ─── Public routes ────────────────────────────────────────────────────────────
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);

// ─── Protected routes (phải đăng nhập) ───────────────────────────────────────
//
// Phân quyền:
//   ADMIN      → toàn quyền (GET, POST, PUT, DELETE)
//   USER       → chỉ xem + nhận diện (GET + POST /recognitions)
//   PENDING    → không được truy cập (bị chặn ở middleware authenticate + role)
//
// Nhận diện: USER và ADMIN đều được
app.use("/api/recognitions", authenticate, userOrAdmin, recognitionRoutes);

// Xe, chủ xe: USER chỉ GET; ADMIN full quyền
// → áp dụng middleware ở từng route file (xem bên dưới)
app.use("/api/vehicles", authenticate, userOrAdmin, vehicleRoutes);
app.use("/api/owners",   authenticate, userOrAdmin, ownerRoutes);

// Camera + Cấu hình: chỉ ADMIN
app.use("/api/cameras",  authenticate, adminOnly, cameraRoutes);

app.use(errorHandler);

module.exports = { app };

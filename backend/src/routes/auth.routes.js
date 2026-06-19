const express = require("express");
const { loginController, registerController, getMeController } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginController);

// POST /api/auth/register
router.post("/register", registerController);

// GET /api/auth/me  — cần token hợp lệ
router.get("/me", authenticate, getMeController);

module.exports = router;

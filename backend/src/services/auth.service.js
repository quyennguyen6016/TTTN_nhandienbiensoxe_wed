const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "platevision_secret_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// ─── Đăng nhập ────────────────────────────────────────────────────────────────
async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    const err = new Error("Sai tên đăng nhập hoặc mật khẩu.");
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error("Tài khoản đã bị vô hiệu hóa.");
    err.statusCode = 403;
    throw err;
  }

  if (user.role === "PENDING") {
    const err = new Error("Tài khoản đang chờ admin phê duyệt.");
    err.statusCode = 403;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const err = new Error("Sai tên đăng nhập hoặc mật khẩu.");
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}

// ─── Đăng ký ──────────────────────────────────────────────────────────────────
async function register(username, password, fullName, email) {
  // Kiểm tra trùng username
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    const err = new Error("Tên đăng nhập đã tồn tại.");
    err.statusCode = 409;
    throw err;
  }

  // Kiểm tra trùng email nếu có
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      const err = new Error("Email đã được sử dụng.");
      err.statusCode = 409;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName: fullName || null,
      email: email || null,
      role: "PENDING", // Mặc định chờ admin duyệt
    },
  });

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

// ─── Xác minh token ───────────────────────────────────────────────────────────
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    const err = new Error("Token không hợp lệ hoặc đã hết hạn.");
    err.statusCode = 401;
    throw err;
  }
}

// ─── Lấy thông tin user hiện tại ─────────────────────────────────────────────
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, fullName: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    const err = new Error("Không tìm thấy tài khoản.");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

module.exports = { login, register, verifyToken, getMe };

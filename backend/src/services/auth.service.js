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
      id:       user.id,
      username: user.username,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role,
    },
  };
}

// ─── Đăng ký — tự động tạo Owner cùng lúc ────────────────────────────────────
async function register(username, password, fullName, email, phone) {
  // Kiểm tra trùng username
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    const err = new Error("Tên đăng nhập đã tồn tại.");
    err.statusCode = 409;
    throw err;
  }

  // Kiểm tra trùng email
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      const err = new Error("Email đã được sử dụng.");
      err.statusCode = 409;
      throw err;
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Dùng transaction: tạo Owner + User cùng lúc, đảm bảo không bị lỗi giữa chừng
  const result = await prisma.$transaction(async (tx) => {
    // 1. Tạo Owner
    const owner = await tx.owner.create({
      data: {
        fullName: fullName || username,
        email:    email    || null,
        phone:    phone    || null,
      },
    });

    // 2. Tạo User và gán thẳng owner_id
    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        fullName: fullName || null,
        email:    email    || null,
        role:     "USER",  // USER thường, không cần PENDING
        ownerId:  owner.id,
      },
    });

    return { user, owner };
  });

  return {
    id:       result.user.id,
    username: result.user.username,
    fullName: result.user.fullName,
    email:    result.user.email,
    role:     result.user.role,
    ownerId:  result.owner.id,
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

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, fullName: true,
      email: true, role: true, createdAt: true,
    },
  });
  if (!user) {
    const err = new Error("Không tìm thấy tài khoản.");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

module.exports = { login, register, verifyToken, getMe };

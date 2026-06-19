const { verifyToken } = require("../services/auth.service");

// ─── Xác thực JWT ─────────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Chưa đăng nhập." });
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    req.user = payload; // { userId, username, role }
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({ success: false, message: err.message });
  }
}

// ─── Phân quyền theo role ─────────────────────────────────────────────────────
// Dùng: requireRole("ADMIN") hoặc requireRole("ADMIN", "USER")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Chưa đăng nhập." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }
    next();
  };
}

// ─── Shortcut guards ──────────────────────────────────────────────────────────
const adminOnly   = requireRole("ADMIN");
const userOrAdmin = requireRole("ADMIN", "USER");

module.exports = { authenticate, requireRole, adminOnly, userOrAdmin };

const { login, register, getMe } = require("../services/auth.service");

// POST /api/auth/login
async function loginController(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên đăng nhập và mật khẩu.",
      });
    }
    const result = await login(username.trim(), password);
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/register
async function registerController(req, res, next) {
  try {
    const { username, password, fullName, email, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên đăng nhập và mật khẩu.",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự.",
      });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên.",
      });
    }

    const user = await register(
      username.trim(),
      password,
      fullName.trim(),
      email?.trim(),
      phone?.trim()
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công. Vui lòng đăng nhập.",
      user,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function getMeController(req, res, next) {
  try {
    const user = await getMe(req.user.userId);
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

module.exports = { loginController, registerController, getMeController };

const express = require("express");
const bcrypt = require("bcrypt");
const { prisma } = require("../db/prisma");
const { asyncHandler } = require("../utils/async-handler");
const { optionalString, requiredString, parseId } = require("../utils/http-error");
const { normalizePlateNumber } = require("../utils/plate");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(authenticate);

// ─── GET /api/me ──────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    select: {
      id: true, username: true, fullName: true,
      email: true, role: true, isActive: true, createdAt: true,
      owner: {
        select: {
          id: true, fullName: true, phone: true,
          email: true, address: true,
          vehicles: {
            select: {
              id: true, plateNumber: true,
              vehicleType: true, brand: true, color: true, province: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  res.json({ success: true, data: user });
}));

// ─── PUT /api/me ──────────────────────────────────────────────────────────────
router.put("/", asyncHandler(async (req, res) => {
  const { fullName, email, phone, address, currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    include: { owner: true },
  });

  let passwordHash = user.passwordHash;
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập mật khẩu hiện tại." });
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }
    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      fullName:     optionalString(fullName) ?? user.fullName,
      email:        optionalString(email)    ?? user.email,
      passwordHash: passwordHash,
    },
  });

  if (user.owner) {
    await prisma.owner.update({
      where: { id: user.owner.id },
      data: {
        fullName: optionalString(fullName) ?? user.owner.fullName,
        phone:    optionalString(phone)    !== undefined ? optionalString(phone) : user.owner.phone,
        address:  optionalString(address)  !== undefined ? optionalString(address) : user.owner.address,
        email:    optionalString(email)    ?? user.owner.email,
      },
    });
  }

  res.json({ success: true, message: "Đã cập nhật thông tin." });
}));

// ─── GET /api/me/vehicles ─────────────────────────────────────────────────────
router.get("/vehicles", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    select: { owner: { select: { id: true } } },
  });

  if (!user.owner) return res.json({ success: true, data: [] });

  const vehicles = await prisma.vehicle.findMany({
    where:   { ownerId: user.owner.id },
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: vehicles });
}));

// ─── POST /api/me/vehicles ────────────────────────────────────────────────────
router.post("/vehicles", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    select: { owner: { select: { id: true } } },
  });

  if (!user.owner) {
    return res.status(400).json({ success: false, message: "Tài khoản chưa được gán chủ xe." });
  }

  const { plateNumber, vehicleType, brand, color, province, note } = req.body;
  const cleanPlate = requiredString(plateNumber, "plateNumber");
  const normalized = normalizePlateNumber(cleanPlate);

  if (!normalized) {
    return res.status(400).json({ success: false, message: "Biển số không hợp lệ." });
  }

  const existing = await prisma.vehicle.findUnique({ where: { normalizedPlateNumber: normalized } });
  if (existing) {
    return res.status(409).json({ success: false, message: "Biển số này đã được đăng ký." });
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      plateNumber:           cleanPlate,
      normalizedPlateNumber: normalized,
      ownerId:               user.owner.id,
      vehicleType:           optionalString(vehicleType) || "Xe máy",
      brand:                 optionalString(brand),
      color:                 optionalString(color),
      province:              optionalString(province),
      note:                  optionalString(note),
    },
    include: { owner: true },
  });

  res.status(201).json({ success: true, data: vehicle });
}));

// ─── DELETE /api/me/vehicles/:id ──────────────────────────────────────────────
router.delete("/vehicles/:id", asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    select: { owner: { select: { id: true } } },
  });

  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id } });
  if (vehicle.ownerId !== user.owner?.id) {
    return res.status(403).json({ success: false, message: "Bạn không có quyền xóa xe này." });
  }

  await prisma.vehicle.delete({ where: { id } });
  res.status(204).send();
}));

// ─── GET /api/me/history — hỗ trợ ?page=&pageSize=, ẩn thông tin xe khác ─────
router.get("/history", asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.userId },
    select: { owner: { select: { id: true } } },
  });

  const myPlates = user.owner
    ? (await prisma.vehicle.findMany({
        where:  { ownerId: user.owner.id },
        select: { normalizedPlateNumber: true },
      })).map(v => v.normalizedPlateNumber)
    : [];

  const page     = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Number(req.query.pageSize) || 50, 200);
  const skip     = (page - 1) * pageSize;

  const where = myPlates.length
    ? { normalizedPlateNumber: { in: myPlates } }
    : { id: -1 }; // không có xe nào → trả rỗng

  const [logs, totalCount] = await Promise.all([
    prisma.recognitionLog.findMany({
      where,
      include: { vehicle: { include: { owner: true } }, camera: true },
      orderBy: { recognizedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.recognitionLog.count({ where }),
  ]);

  // Ẩn thông tin xe không thuộc user (phòng trường hợp biển số trùng)
  const sanitized = logs.map(log => {
    const isMine = myPlates.includes(log.normalizedPlateNumber);
    return {
      ...log,
      province:          isMine ? log.province          : null,
      ownerNameSnapshot: isMine ? log.ownerNameSnapshot  : null,
      vehicle: isMine ? log.vehicle : null,
    };
  });

  res.json({
    success: true,
    data: sanitized,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(Math.ceil(totalCount / pageSize), 1),
    },
  });
}));

module.exports = router;
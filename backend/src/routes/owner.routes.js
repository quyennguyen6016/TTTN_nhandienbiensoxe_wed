const express = require("express");

const { prisma } = require("../db/prisma");
const { asyncHandler } = require("../utils/async-handler");
const {
  optionalString,
  parseId,
  requiredString,
} = require("../utils/http-error");
const { adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

// USER và ADMIN đều xem được
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = optionalString(req.query.search);
    const owners = await prisma.owner.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: { vehicles: true },
    });
    res.json({ success: true, data: owners });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const owner = await prisma.owner.findUniqueOrThrow({
      where: { id },
      include: { vehicles: true },
    });
    res.json({ success: true, data: owner });
  })
);

// Chỉ ADMIN mới thêm / sửa / xóa
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { fullName, phone, email, address } = req.body;
    const owner = await prisma.owner.create({
      data: {
        fullName: requiredString(fullName, "fullName"),
        phone: optionalString(phone),
        email: optionalString(email),
        address: optionalString(address),
      },
    });
    res.status(201).json({ success: true, data: owner });
  })
);

router.put(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { fullName, phone, email, address } = req.body;
    const owner = await prisma.owner.update({
      where: { id },
      data: {
        fullName: requiredString(fullName, "fullName"),
        phone: optionalString(phone),
        email: optionalString(email),
        address: optionalString(address),
      },
      include: { vehicles: true },
    });
    res.json({ success: true, data: owner });
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await prisma.owner.delete({ where: { id } });
    res.status(204).send();
  })
);

module.exports = router;
const express = require("express");

const { prisma } = require("../db/prisma");
const { asyncHandler } = require("../utils/async-handler");
const {
  createHttpError,
  optionalString,
  parseId,
  requiredString,
} = require("../utils/http-error");
const { normalizePlateNumber } = require("../utils/plate");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = optionalString(req.query.search);
    const normalizedSearch = normalizePlateNumber(search);
    const vehicles = await prisma.vehicle.findMany({
      where: search
        ? {
            OR: [
              {
                normalizedPlateNumber: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
              { plateNumber: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { owner: { fullName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: { owner: true },
    });
    res.json({ success: true, data: vehicles });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id },
      include: {
        owner: true,
        logs: {
          orderBy: { recognizedAt: "desc" },
          take: 20,
          include: { camera: true },
        },
      },
    });
    res.json({ success: true, data: vehicle });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      plateNumber,
      ownerId,
      ownerName,
      vehicleType,
      brand,
      color,
      province,
      note,
    } = req.body;

    const cleanPlateNumber = requiredString(plateNumber, "plateNumber");
    const normalizedPlateNumber = normalizePlateNumber(cleanPlateNumber);
    if (!normalizedPlateNumber) {
      throw createHttpError(400, "plateNumber must contain letters or numbers.");
    }

    let resolvedOwnerId = ownerId ? Number(ownerId) : null;
    const cleanOwnerName = optionalString(ownerName);
    if (!resolvedOwnerId && cleanOwnerName) {
      const owner =
        (await prisma.owner.findFirst({ where: { fullName: cleanOwnerName } })) ||
        (await prisma.owner.create({ data: { fullName: cleanOwnerName } }));
      resolvedOwnerId = owner.id;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: cleanPlateNumber,
        normalizedPlateNumber,
        ownerId: resolvedOwnerId,
        vehicleType: optionalString(vehicleType) || "Xe máy",
        brand: optionalString(brand),
        color: optionalString(color),
        province: optionalString(province),
        note: optionalString(note),
      },
      include: { owner: true },
    });

    res.status(201).json({ success: true, data: vehicle });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const {
      plateNumber,
      ownerId,
      ownerName,
      vehicleType,
      brand,
      color,
      province,
      note,
    } = req.body;

    const cleanPlateNumber = requiredString(plateNumber, "plateNumber");
    const normalizedPlateNumber = normalizePlateNumber(cleanPlateNumber);
    if (!normalizedPlateNumber) {
      throw createHttpError(400, "plateNumber must contain letters or numbers.");
    }

    let resolvedOwnerId = ownerId ? Number(ownerId) : null;
    const cleanOwnerName = optionalString(ownerName);
    if (!resolvedOwnerId && cleanOwnerName) {
      const owner =
        (await prisma.owner.findFirst({ where: { fullName: cleanOwnerName } })) ||
        (await prisma.owner.create({ data: { fullName: cleanOwnerName } }));
      resolvedOwnerId = owner.id;
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        plateNumber: cleanPlateNumber,
        normalizedPlateNumber,
        ownerId: resolvedOwnerId,
        vehicleType: optionalString(vehicleType) || "Xe máy",
        brand: optionalString(brand),
        color: optionalString(color),
        province: optionalString(province),
        note: optionalString(note),
      },
      include: { owner: true },
    });

    res.json({ success: true, data: vehicle });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await prisma.vehicle.delete({ where: { id } });
    res.status(204).send();
  })
);

module.exports = router;

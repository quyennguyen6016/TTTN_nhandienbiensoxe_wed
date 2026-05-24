const express = require("express");

const { prisma } = require("../db/prisma");
const { asyncHandler } = require("../utils/async-handler");
const {
  optionalString,
  parseId,
  requiredString,
} = require("../utils/http-error");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = optionalString(req.query.search);
    const cameras = await prisma.camera.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { sourceUrl: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: cameras });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const camera = await prisma.camera.findUniqueOrThrow({
      where: { id },
      include: {
        logs: {
          orderBy: { recognizedAt: "desc" },
          take: 20,
          include: { vehicle: { include: { owner: true } } },
        },
      },
    });
    res.json({ success: true, data: camera });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, sourceUrl, location, isActive } = req.body;

    const camera = await prisma.camera.create({
      data: {
        name: requiredString(name, "name"),
        sourceUrl: optionalString(sourceUrl),
        location: optionalString(location),
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: camera });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { name, sourceUrl, location, isActive } = req.body;

    const camera = await prisma.camera.update({
      where: { id },
      data: {
        name: requiredString(name, "name"),
        sourceUrl: optionalString(sourceUrl),
        location: optionalString(location),
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

    res.json({ success: true, data: camera });
  })
);

router.patch(
  "/:id/active",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const camera = await prisma.camera.update({
      where: { id },
      data: { isActive: Boolean(req.body.isActive) },
    });
    res.json({ success: true, data: camera });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await prisma.camera.delete({ where: { id } });
    res.status(204).send();
  })
);

module.exports = router;

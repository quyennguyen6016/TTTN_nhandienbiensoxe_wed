const express = require("express");

const { config } = require("../config");
const { imageUpload } = require("../middleware/upload");
const { asyncHandler } = require("../utils/async-handler");
const { parseId } = require("../utils/http-error");
const { toPublicUploadPath } = require("../utils/paths");
const { prisma } = require("../db/prisma");
const { recognizeImage } = require("../services/ai.service");
const { normalizePlateNumber } = require("../utils/plate");
const {
  createRecognitionLog,
  getRecognitionSummary,
  listRecognitionLogs,
} = require("../services/recognition.service");

const router = express.Router();

// ─── GET /api/recognitions — hỗ trợ ?page=&pageSize= ─────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { logs, pagination } = await listRecognitionLogs(req.query);
    res.json({ success: true, data: logs, pagination });
  })
);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await getRecognitionSummary();
    res.json({ success: true, data: summary });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const log = await prisma.recognitionLog.findUniqueOrThrow({
      where: { id },
      include: {
        vehicle: { include: { owner: true } },
        camera: true,
      },
    });
    res.json({ success: true, data: log });
  })
);

// ─── Helper: kiểm tra biển số có thuộc về user hiện tại không ─────────────────
async function isPlateOwnedByUser(normalizedPlateNumber, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, owner: { select: { id: true } } },
  });

  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.owner) return false;

  const vehicle = await prisma.vehicle.findUnique({
    where: { normalizedPlateNumber },
    select: { ownerId: true },
  });

  return vehicle?.ownerId === user.owner.id;
}

router.post(
  "/image",
  imageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      const error = new Error("Image file is required. Use field name 'image'.");
      error.statusCode = 400;
      throw error;
    }

    const aiResponse = await recognizeImage(req.file.path);
    if (!aiResponse.success) {
      return res.status(422).json(aiResponse);
    }

    const imagePath = toPublicUploadPath(req.file.path, config.projectRoot);
    const annotatedImagePath = toPublicUploadPath(
      aiResponse.annotatedPath,
      config.projectRoot
    );

    const requestedSource =
      req.body.source === "CAMERA_FRAME" ? "CAMERA_FRAME" : "IMAGE_UPLOAD";
    const { log, duplicateSkipped } = await createRecognitionLog({
      aiResult: aiResponse.data,
      imagePath,
      annotatedImagePath,
      source: requestedSource,
      cameraId: req.body.cameraId,
      duplicateWindowSeconds: requestedSource === "CAMERA_FRAME" ? 10 : 0,
    });

    const normalizedPlate = normalizePlateNumber(aiResponse.data.plate);
    const ownsThisPlate = await isPlateOwnedByUser(normalizedPlate, req.user.userId);

    let safeRecognition = aiResponse.data;
    let safeLog = log;

    if (!ownsThisPlate) {
      safeRecognition = {
        ...aiResponse.data,
        location: null,
        province_code: null,
      };
      safeLog = {
        ...log,
        province: null,
        provinceCode: null,
        ownerNameSnapshot: null,
        vehicle: log.vehicle
          ? { id: log.vehicle.id, plateNumber: log.vehicle.plateNumber, owner: null }
          : null,
      };
    }

    res.status(201).json({
      success: true,
      data: {
        recognition: safeRecognition,
        log: safeLog,
        duplicateSkipped,
      },
    });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await prisma.recognitionLog.delete({ where: { id } });
    res.status(204).send();
  })
);

module.exports = router;
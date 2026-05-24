const express = require("express");

const { config } = require("../config");
const { imageUpload } = require("../middleware/upload");
const { asyncHandler } = require("../utils/async-handler");
const { parseId } = require("../utils/http-error");
const { toPublicUploadPath } = require("../utils/paths");
const { prisma } = require("../db/prisma");
const { recognizeImage } = require("../services/ai.service");
const {
  createRecognitionLog,
  getRecognitionSummary,
  listRecognitionLogs,
} = require("../services/recognition.service");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await listRecognitionLogs(req.query);
    res.json({ success: true, data: logs });
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

    res.status(201).json({
      success: true,
      data: {
        recognition: aiResponse.data,
        log,
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

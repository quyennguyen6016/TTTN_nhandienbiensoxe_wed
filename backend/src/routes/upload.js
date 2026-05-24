const express = require("express");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Cấu hình multer cho upload ảnh
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  }
});

// POST: Upload image
router.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const { vehicleId } = req.body;

    // Lưu metadata vào database
    const recognition = await prisma.recognition.create({
      data: {
        vehicleId: vehicleId || null,
        imageData: req.file.buffer.toString('base64'), // Hoặc upload to S3/Cloud
        status: "PENDING", // Chờ xử lý Python
        plateNumber: null,
        confidence: null
      }
    });

    res.json({
      id: recognition.id,
      status: "PENDING",
      message: "Image uploaded. Waiting for batch processing."
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Kết quả recognition
router.get("/api/recognition/:id", async (req, res) => {
  try {
    const recognition = await prisma.recognition.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: {
          include: { owner: true }
        }
      }
    });

    if (!recognition) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({
      id: recognition.id,
      status: recognition.status,
      plateNumber: recognition.plateNumber,
      confidence: recognition.confidence,
      ownerName: recognition.vehicle?.owner?.name || "Vãng lai",
      vehicle: recognition.vehicle
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET: List pending recognitions (for batch processing)
router.get("/api/recognition/pending", async (req, res) => {
  try {
    const pending = await prisma.recognition.findMany({
      where: { status: "PENDING" },
      take: 10 // Batch 10 ảnh mỗi lần
    });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update recognition result (từ Python script)
router.put("/api/recognition/:id", async (req, res) => {
  try {
    const { plateNumber, confidence, vehicleId } = req.body;

    const recognition = await prisma.recognition.update({
      where: { id: req.params.id },
      data: {
        plateNumber,
        confidence,
        vehicleId,
        status: "COMPLETED",
        processedAt: new Date()
      }
    });

    res.json(recognition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
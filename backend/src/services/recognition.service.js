const { prisma } = require("../db/prisma");
const { normalizePlateNumber } = require("../utils/plate");

async function createRecognitionLog({
  aiResult,
  imagePath,
  annotatedImagePath,
  source,
  cameraId,
  duplicateWindowSeconds = 0,
}) {
  const normalizedPlateNumber = normalizePlateNumber(aiResult.plate);
  const vehicle = await prisma.vehicle.findUnique({
    where: { normalizedPlateNumber },
    include: { owner: true },
  });
  const cleanCameraId = cameraId ? Number(cameraId) : null;

  if (duplicateWindowSeconds > 0) {
    const recentDuplicate = await prisma.recognitionLog.findFirst({
      where: {
        normalizedPlateNumber,
        cameraId: cleanCameraId,
        recognizedAt: {
          gte: new Date(Date.now() - duplicateWindowSeconds * 1000),
        },
      },
      orderBy: { recognizedAt: "desc" },
      include: {
        vehicle: {
          include: {
            owner: true,
          },
        },
        camera: true,
      },
    });

    if (recentDuplicate) {
      return { log: recentDuplicate, duplicateSkipped: true };
    }
  }

  const log = await prisma.recognitionLog.create({
    data: {
      plateNumber: aiResult.plate,
      normalizedPlateNumber,
      vehicleId: vehicle?.id,
      cameraId: cleanCameraId,
      source,
      provinceCode: aiResult.province_code,
      province: aiResult.location,
      ownerNameSnapshot: vehicle?.owner?.fullName || "Vang lai",
      confidence: aiResult.confidence,
      bbox: aiResult.bbox || undefined,
      imagePath,
      annotatedImagePath,
      rawResult: aiResult,
    },
    include: {
      vehicle: {
        include: {
          owner: true,
        },
      },
      camera: true,
    },
  });

  return { log, duplicateSkipped: false };
}

async function listRecognitionLogs({
  plateNumber,
  cameraId,
  vehicleId,
  source,
  from,
  to,
  limit = 50,
}) {
  const where = {};

  if (plateNumber) {
    where.normalizedPlateNumber = {
      contains: normalizePlateNumber(plateNumber),
      mode: "insensitive",
    };
  }
  if (cameraId) {
    where.cameraId = Number(cameraId);
  }
  if (vehicleId) {
    where.vehicleId = Number(vehicleId);
  }
  if (source) {
    where.source = source;
  }
  if (from || to) {
    where.recognizedAt = {};
    if (from) {
      where.recognizedAt.gte = new Date(from);
    }
    if (to) {
      where.recognizedAt.lte = new Date(to);
    }
  }

  return prisma.recognitionLog.findMany({
    where,
    orderBy: { recognizedAt: "desc" },
    take: Math.min(Number(limit) || 50, 200),
    include: {
      vehicle: {
        include: {
          owner: true,
        },
      },
      camera: true,
    },
  });
}

async function getRecognitionSummary() {
  const [totalLogs, totalVehicles, totalOwners, totalCameras, recentLogs] =
    await Promise.all([
      prisma.recognitionLog.count(),
      prisma.vehicle.count(),
      prisma.owner.count(),
      prisma.camera.count(),
      prisma.recognitionLog.findMany({
        orderBy: { recognizedAt: "desc" },
        take: 5,
        include: {
          vehicle: { include: { owner: true } },
          camera: true,
        },
      }),
    ]);

  return {
    totalLogs,
    totalVehicles,
    totalOwners,
    totalCameras,
    recentLogs,
  };
}

module.exports = {
  createRecognitionLog,
  getRecognitionSummary,
  listRecognitionLogs,
};

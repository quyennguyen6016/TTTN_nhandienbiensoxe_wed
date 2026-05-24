const fs = require("fs");
const multer = require("multer");
const path = require("path");

const { config } = require("../config");

fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync(config.annotatedDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    return cb(null, true);
  },
});

module.exports = { imageUpload };

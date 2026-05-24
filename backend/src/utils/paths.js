const path = require("path");

function toPublicUploadPath(filePath, projectRoot) {
  if (!filePath) {
    return null;
  }

  const relativePath = path.relative(
    path.resolve(projectRoot, "backend", "uploads"),
    filePath
  );

  return `/uploads/${relativePath.replaceAll(path.sep, "/")}`;
}

module.exports = { toPublicUploadPath };

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.statusCode || 500;
  let message = error.message || "Internal server error";

  if (error.code === "P2002") {
    status = 409;
    const fields = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : "unique field";
    message = `Duplicate value for ${fields}.`;
  }

  if (error.code === "P2003") {
    status = 400;
    message = "Related record does not exist or cannot be used.";
  }

  if (error.code === "P2025") {
    status = 404;
    message = "Record not found.";
  }

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({
    success: false,
    message,
  });
}

module.exports = { errorHandler };

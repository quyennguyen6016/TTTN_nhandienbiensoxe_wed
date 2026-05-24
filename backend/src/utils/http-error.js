function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseId(value, fieldName = "id") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer.`);
  }
  return id;
}

function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw createHttpError(400, `${fieldName} is required.`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim();
}

module.exports = {
  createHttpError,
  parseId,
  requiredString,
  optionalString,
};

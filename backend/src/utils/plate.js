function normalizePlateNumber(plateNumber) {
  if (!plateNumber) {
    return "";
  }

  return String(plateNumber)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

module.exports = { normalizePlateNumber };

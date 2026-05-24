const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "license-plate-backend",
  });
});

module.exports = router;

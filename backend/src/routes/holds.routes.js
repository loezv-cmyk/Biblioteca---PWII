const express = require("express");
const router = express.Router();

const {
  listHolds,
  getHold,
  createHold,
  updateHold,
  deleteHold,
} = require("../modules/holds/holds.controller");

router.get("/", listHolds);
router.get("/:id", getHold);
router.post("/", createHold);
router.put("/:id", updateHold);
router.delete("/:id", deleteHold);

module.exports = router;

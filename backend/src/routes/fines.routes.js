const express = require("express");
const router = express.Router();

const {
  listFines,
  getFine,
  createFine,
  updateFine,
  deleteFine,
} = require("../modules/fines/fines.controller");

router.get("/", listFines);
router.get("/:id", getFine);
router.post("/", createFine);
router.put("/:id", updateFine);
router.delete("/:id", deleteFine);

module.exports = router;

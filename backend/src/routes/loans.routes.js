const express = require("express");
const router = express.Router();

const {
  listLoans,
  getLoan,
  createLoan,
  returnLoan,
  deleteLoan,
} = require("../modules/loans/loans.controller");

router.get("/", listLoans);
router.get("/:id", getLoan);
router.post("/", createLoan);
router.put("/:id/return", returnLoan);
router.delete("/:id", deleteLoan);

module.exports = router;

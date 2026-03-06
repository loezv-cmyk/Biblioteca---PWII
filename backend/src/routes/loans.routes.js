const express = require("express");
const router = express.Router();

const { listLoans, createLoan, returnLoan } = require("../modules/loans/loans.controller");

router.get("/", listLoans);
router.post("/", createLoan);
router.put("/:id/return", returnLoan);

module.exports = router;
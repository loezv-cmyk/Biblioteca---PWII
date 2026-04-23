const express = require("express");
const router = express.Router();

const {
  mostBorrowedBooks,
  usersWithMostFines,
  overdueLoans,
  dashboardSummary,
  userActivity,
} = require("../modules/reports/reports.controller");

router.get("/most-borrowed-books", mostBorrowedBooks);
router.get("/users-with-most-fines", usersWithMostFines);
router.get("/overdue-loans", overdueLoans);
router.get("/dashboard", dashboardSummary);
router.get("/user-activity/:userId", userActivity);

module.exports = router;

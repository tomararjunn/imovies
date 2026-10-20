const express = require("express");
const router = express.Router();
const c = require("../controllers/bookingController");
const { fetchUser, adminOnly, userOnly } = require("../middlewares/fetchUser");

// user actions
router.post("/lock", fetchUser, userOnly, c.lockSeats);
router.post("/release", fetchUser, userOnly, c.releaseSeats);
router.post("/checkout", fetchUser, userOnly, c.checkout);
router.post("/confirm", fetchUser, userOnly, c.confirmBooking);
router.post("/fail", fetchUser, userOnly, c.failBooking);
router.get("/my", fetchUser, userOnly, c.myBookings);

// admin
router.get("/", fetchUser, adminOnly, c.adminListBookings);
router.get("/admin/report", fetchUser, adminOnly, c.adminReport);

// these must stay LAST because ":bookingId" matches anything
router.put("/:bookingId/cancel", fetchUser, c.cancelBooking);
router.get("/:bookingId", fetchUser, c.getBooking);

module.exports = router;    
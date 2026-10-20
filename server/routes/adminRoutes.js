const express = require("express");
const router = express.Router();
const { adminRegister, adminLogin } = require("../controllers/adminController");
const { getStats, listUsers, deleteUser } = require("../controllers/adminDashboardController");
const { fetchUser, adminOnly } = require("../middlewares/fetchUser");

router.post("/register", adminRegister);
router.post("/login", adminLogin);

router.get("/stats", fetchUser, adminOnly, getStats);
router.get("/users", fetchUser, adminOnly, listUsers);
router.delete("/users/:id", fetchUser, adminOnly, deleteUser);

module.exports = router;
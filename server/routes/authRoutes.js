const express = require("express");
const router = express.Router();
const { register, login, logout, getMe } = require("../controllers/authController");
const { updateMe } = require("../controllers/profileController");
const { fetchUser, userOnly } = require("../middlewares/fetchUser");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", fetchUser, getMe);
router.put("/me", fetchUser, userOnly, updateMe);

module.exports = router;
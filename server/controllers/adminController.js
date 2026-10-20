const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel");
const generateToken = require("../utils/generateToken");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/admin/register
const adminRegister = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, message: "Username must be 3-20 characters" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const exists = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) {
      return res.status(409).json({ success: false, message: "Username or email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, email, password: hashed });
    const token = generateToken(admin, "admin");

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      token,
      user: { id: admin._id, username: admin.username, email: admin.email, role: "admin" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(admin, "admin");

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: { id: admin._id, username: admin.username, email: admin.email, role: "admin" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { adminRegister, adminLogin };
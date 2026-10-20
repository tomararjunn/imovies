const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");

// PUT /api/auth/me   body: { username?, currentPassword?, newPassword? }
// Email cannot change, because bookings and favorites are linked to it.
const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { username, currentPassword, newPassword } = req.body;

    if (username !== undefined && username !== user.username) {
      if (typeof username !== "string" || username.length < 3 || username.length > 20) {
        return res.status(400).json({ success: false, message: "Username must be 3-20 characters" });
      }
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) return res.status(409).json({ success: false, message: "Username already in use" });
      user.username = username;
    }

    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ success: false, message: "Current password is wrong" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    const token = generateToken(user, "user");

    res.json({
      success: true,
      message: "Profile updated",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: "user" },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { updateMe };
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, minlength: 3, maxlength: 20, unique: true, trim: true },
    email: { type: String, required: true, unique: true, maxlength: 50, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
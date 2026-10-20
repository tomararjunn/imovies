const User = require("../models/userModel");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");
const Booking = require("../models/bookingModel");
const Favorite = require("../models/favoriteModel");
const Review = require("../models/reviewModel");

// GET /api/auth/admin/stats
const getStats = async (req, res) => {
  try {
    const [users, movies, theatres, shows, bookings, revenue] = await Promise.all([
      User.countDocuments(),
      Movie.countDocuments(),
      Theatre.countDocuments(),
      Show.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    res.json({
      success: true,
      stats: { users, movies, theatres, shows, bookings, revenue: revenue[0]?.total || 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/admin/users
const listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, total: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/auth/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await Favorite.deleteMany({ userEmail: user.email });
    await Review.deleteMany({ user: user._id });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, listUsers, deleteUser };
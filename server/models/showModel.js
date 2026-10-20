const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    showId: { type: String, required: true, unique: true },
    adminEmail: { type: String, required: true },
    movieId: { type: String, required: true },
    theatreName: { type: String, required: true },
    showdate: { type: String, required: true }, // "YYYY-MM-DD"
    showtime: { type: String, required: true }, // "HH:mm" (24h)
    // seat map: { A1: { class, price, status: "available" | "locked" | "booked", lockedBy, lockExpires, bookedBy, bookingId } }
    tickets: { type: Object },
  },
  { timestamps: true, minimize: false }
);

showSchema.index({ movieId: 1, showdate: 1 });
showSchema.index({ showdate: 1 });
// One show per theatre at a given date and time
showSchema.index({ theatreName: 1, showdate: 1, showtime: 1 }, { unique: true });

module.exports = mongoose.model("Show", showSchema);
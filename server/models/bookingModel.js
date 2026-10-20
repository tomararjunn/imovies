const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    userEmail: { type: String, required: true },
    showId: { type: String, required: true },
    // { seats: [{ seatId, class, price }] }
    ticketsData: { type: Object, required: true },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled", "expired"],
      default: "pending",
    },
    orderId: { type: String },
    paymentId: { type: String },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    refundStatus: { type: String },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false }
);

bookingSchema.index({ userEmail: 1, createdAt: -1 });
bookingSchema.index({ showId: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
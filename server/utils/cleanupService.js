const Booking = require("../models/bookingModel");

// 1) "pending" bookings older than 15 minutes were never paid -> mark "expired"
//    (their seat locks already expire by themselves)
// 2) failed / expired bookings older than 7 days are deleted
const cleanupOldBookings = async () => {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const expired = await Booking.updateMany(
    { status: "pending", createdAt: { $lt: fifteenMinAgo } },
    { status: "expired" }
  );
  const removed = await Booking.deleteMany({
    status: { $in: ["failed", "expired"] },
    updatedAt: { $lt: sevenDaysAgo },
  });

  if (expired.modifiedCount || removed.deletedCount) {
    console.log(`Cleanup: ${expired.modifiedCount} expired, ${removed.deletedCount} deleted`);
  }
};

module.exports = { cleanupOldBookings };
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const Movie = require("../models/movieModel");
const { sendReminder } = require("./mailer");

// Sends a reminder for every confirmed booking whose show starts within 24 hours.
// Show date/time are treated as the server's local time.
const sendReminderEmails = async () => {
  const bookings = await Booking.find({ status: "confirmed", reminderSent: false }).lean();
  if (!bookings.length) return 0;

  const shows = await Show.find({ showId: { $in: bookings.map((b) => b.showId) } }).select("-tickets").lean();
  const showMap = {};
  shows.forEach((s) => (showMap[s.showId] = s));

  const movies = await Movie.find({ movieId: { $in: shows.map((s) => s.movieId) } }).lean();
  const movieMap = {};
  movies.forEach((m) => (movieMap[m.movieId] = m));

  const now = Date.now();
  let sent = 0;

  for (const b of bookings) {
    const show = showMap[b.showId];
    if (!show) continue;

    const diff = new Date(`${show.showdate}T${show.showtime}:00`).getTime() - now;
    if (diff <= 0 || diff > 24 * 60 * 60 * 1000) continue;

    await sendReminder(b.userEmail, {
      movieName: movieMap[show.movieId]?.movieName || "Your movie",
      theatreName: show.theatreName,
      showdate: show.showdate,
      showtime: show.showtime,
      seats: (b.ticketsData?.seats || []).map((s) => s.seatId),
      amount: b.amount,
      bookingId: b.bookingId,
    });
    await Booking.updateOne({ bookingId: b.bookingId }, { reminderSent: true });
    sent++;
  }

  if (sent) console.log(`Reminder emails sent: ${sent}`);
  return sent;
};

module.exports = { sendReminderEmails };
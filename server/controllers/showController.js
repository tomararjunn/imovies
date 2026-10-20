const crypto = require("crypto");
const Show = require("../models/showModel");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Booking = require("../models/bookingModel");
const { buildTickets } = require("../utils/seatLayout");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// A locked seat whose hold has expired counts as available
const effectiveStatus = (t, now) => (t.status === "locked" && t.lockExpires <= now ? "available" : t.status);

const countAvailable = (tickets = {}) => {
  const now = Date.now();
  return Object.values(tickets).filter((t) => effectiveStatus(t, now) === "available").length;
};

// Removes the big seat map and adds seat counts instead
const toSummary = (show) => {
  const { tickets, ...rest } = show;
  return { ...rest, availableSeats: countAvailable(tickets), totalSeats: Object.keys(tickets || {}).length };
};

// What a customer is allowed to see: never other people's emails or booking ids
const publicTickets = (tickets = {}, email) => {
  const now = Date.now();
  const out = {};
  for (const [id, t] of Object.entries(tickets)) {
    out[id] = {
      class: t.class,
      price: t.price,
      status: effectiveStatus(t, now),
      mine: t.status === "locked" && t.lockedBy === email && t.lockExpires > now,
    };
  }
  return out;
};

// POST /api/shows  (admin)
const addShow = async (req, res) => {
  try {
    const { movieId, theatreName, showdate, showtime } = req.body;

    if (!movieId || !theatreName || !showdate || !showtime) {
      return res.status(400).json({ success: false, message: "movieId, theatreName, showdate and showtime are required" });
    }
    if (!dateRegex.test(showdate)) {
      return res.status(400).json({ success: false, message: "showdate must be YYYY-MM-DD" });
    }
    if (!timeRegex.test(showtime)) {
      return res.status(400).json({ success: false, message: "showtime must be HH:mm (24 hour)" });
    }

    const movie = await Movie.findOne({ movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    const theatre = await Theatre.findOne({ theatreName });
    if (!theatre) return res.status(404).json({ success: false, message: "Theatre not found" });

    const clash = await Show.findOne({ theatreName, showdate, showtime });
    if (clash) {
      return res.status(409).json({ success: false, message: "This theatre already has a show at that date and time" });
    }

    const show = await Show.create({
      showId: crypto.randomUUID(),
      adminEmail: req.user.email,
      movieId,
      theatreName,
      showdate,
      showtime,
      tickets: buildTickets(theatre),
    });

    res.status(201).json({ success: true, message: "Show added", show: toSummary(show.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shows?movieId=&theatreName=&date=
const getShows = async (req, res) => {
  try {
    const filter = {};
    if (req.query.movieId) filter.movieId = req.query.movieId;
    if (req.query.theatreName) filter.theatreName = req.query.theatreName;
    if (req.query.date) filter.showdate = req.query.date;

    const shows = await Show.find(filter).sort({ showdate: 1, showtime: 1 }).lean();
    res.json({ success: true, total: shows.length, shows: shows.map(toSummary) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shows/getmovieshows/:movieName
const getMovieShows = async (req, res) => {
  try {
    const safe = req.params.movieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const movie = await Movie.findOne({ movieName: { $regex: `^${safe}$`, $options: "i" } });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    const shows = await Show.find({ movieId: movie.movieId }).sort({ showdate: 1, showtime: 1 }).lean();

    const theatres = await Theatre.find({ theatreName: { $in: shows.map((s) => s.theatreName) } }).lean();
    const byName = {};
    theatres.forEach((t) => (byName[t.theatreName] = t));

    const result = shows.map((s) => ({
      ...toSummary(s),
      location: byName[s.theatreName]?.location,
      prices: {
        balcony: byName[s.theatreName]?.balconySeatPrice,
        middle: byName[s.theatreName]?.middleSeatPrice,
        lower: byName[s.theatreName]?.lowerSeatPrice,
      },
    }));

    res.json({ success: true, movie, total: result.length, shows: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shows/:showId  (seat map used by the seat page)
const getShow = async (req, res) => {
  try {
    const show = await Show.findOne({ showId: req.params.showId }).lean();
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });

    const movie = await Movie.findOne({ movieId: show.movieId });
    const theatre = await Theatre.findOne({ theatreName: show.theatreName });

    show.tickets = publicTickets(show.tickets, req.user.email);

    res.json({ success: true, show, movie, theatre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/shows/:showId  (admin) - change date and/or time only
const updateShow = async (req, res) => {
  try {
    const show = await Show.findOne({ showId: req.params.showId });
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });

    const showdate = req.body.showdate || show.showdate;
    const showtime = req.body.showtime || show.showtime;

    if (!dateRegex.test(showdate)) {
      return res.status(400).json({ success: false, message: "showdate must be YYYY-MM-DD" });
    }
    if (!timeRegex.test(showtime)) {
      return res.status(400).json({ success: false, message: "showtime must be HH:mm (24 hour)" });
    }

    const clash = await Show.findOne({
      theatreName: show.theatreName,
      showdate,
      showtime,
      showId: { $ne: show.showId },
    });
    if (clash) {
      return res.status(409).json({ success: false, message: "This theatre already has a show at that date and time" });
    }

    show.showdate = showdate;
    show.showtime = showtime;
    await show.save();

    res.json({ success: true, message: "Show updated", show: toSummary(show.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/shows/:showId  (admin)
const deleteShow = async (req, res) => {
  try {
    const hasBookings = await Booking.exists({ showId: req.params.showId, status: "confirmed" });
    if (hasBookings) {
      return res.status(409).json({
        success: false,
        message: "This show has confirmed bookings. Cancel them first (Admin > Bookings)",
      });
    }

    const show = await Show.findOneAndDelete({ showId: req.params.showId });
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });

    await Booking.updateMany({ showId: req.params.showId, status: "pending" }, { status: "expired" });

    res.json({ success: true, message: "Show deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addShow, getShows, getMovieShows, getShow, updateShow, deleteShow };
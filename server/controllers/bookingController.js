const crypto = require("crypto");
const Show = require("../models/showModel");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Booking = require("../models/bookingModel");
const { createOrder, verifyPayment, refund } = require("../utils/paymentService");
const { sendBookingConfirmation, sendCancellation } = require("../utils/mailer");

const LOCK_MINUTES = 5;
const MAX_SEATS = 8;
const seatRegex = /^[A-Z]{1,2}\d{1,2}$/;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- helpers ----------
const parseSeats = (seats) => {
  if (!Array.isArray(seats) || seats.length === 0 || seats.length > MAX_SEATS) return null;
  const list = [...new Set(seats.map((s) => String(s).toUpperCase()))];
  return list.every((s) => seatRegex.test(s)) ? list : null;
};

const showStart = (show) => new Date(`${show.showdate}T${show.showtime}:00`);

// Tells connected clients (if Socket.io is enabled) that seats changed
const notifySeats = (req, showId) => {
  const io = req.app.get("io");
  if (io) io.to(`show:${showId}`).emit("seats-updated", { showId });
};

// Frees every seat this user has locked on a show (except the ones in `keep`)
const releaseUserLocks = async (showId, email, keep = []) => {
  const show = await Show.findOne({ showId }).select("tickets").lean();
  if (!show || !show.tickets) return;

  const mine = Object.entries(show.tickets)
    .filter(([id, t]) => t.status === "locked" && t.lockedBy === email && !keep.includes(id))
    .map(([id]) => id);
  if (!mine.length) return;

  const set = {};
  const unset = {};
  mine.forEach((id) => {
    set[`tickets.${id}.status`] = "available";
    unset[`tickets.${id}.lockedBy`] = "";
    unset[`tickets.${id}.lockExpires`] = "";
  });

  await Show.updateOne(
    { showId, $and: mine.map((id) => ({ [`tickets.${id}.lockedBy`]: email })) },
    { $set: set, $unset: unset }
  );
};

const emailDetails = async (booking) => {
  const show = await Show.findOne({ showId: booking.showId }).select("-tickets").lean();
  const movie = show ? await Movie.findOne({ movieId: show.movieId }).lean() : null;
  return {
    movieName: movie?.movieName || "Your movie",
    theatreName: show?.theatreName || "",
    showdate: show?.showdate || "",
    showtime: show?.showtime || "",
    seats: booking.ticketsData.seats.map((s) => s.seatId),
    amount: booking.amount,
    bookingId: booking.bookingId,
    refundStatus: booking.refundStatus,
  };
};

// Adds show, theatre location and movie info to bookings
const enrich = async (bookings) => {
  if (!bookings.length) return [];

  const shows = await Show.find({ showId: { $in: [...new Set(bookings.map((b) => b.showId))] } })
    .select("-tickets")
    .lean();
  const showMap = {};
  shows.forEach((s) => (showMap[s.showId] = s));

  const movies = await Movie.find({ movieId: { $in: [...new Set(shows.map((s) => s.movieId))] } })
    .select("movieId movieName media")
    .lean();
  const movieMap = {};
  movies.forEach((m) => (movieMap[m.movieId] = m));

  const theatres = await Theatre.find({ theatreName: { $in: [...new Set(shows.map((s) => s.theatreName))] } })
    .select("theatreName location")
    .lean();
  const theatreMap = {};
  theatres.forEach((t) => (theatreMap[t.theatreName] = t));

  return bookings.map((b) => {
    const show = showMap[b.showId];
    const movie = show ? movieMap[show.movieId] : null;
    return {
      ...b,
      show: show
        ? {
            showdate: show.showdate,
            showtime: show.showtime,
            theatreName: show.theatreName,
            location: theatreMap[show.theatreName]?.location,
          }
        : null,
      movie: movie ? { movieId: movie.movieId, movieName: movie.movieName, media: movie.media } : null,
    };
  });
};

// ---------- 1. lock seats ----------
// POST /api/bookings/lock   body: { showId, seats: ["A1","A2"] }
const lockSeats = async (req, res) => {
  try {
    const { showId } = req.body;
    const seats = parseSeats(req.body.seats);
    if (!showId || !seats) {
      return res.status(400).json({ success: false, message: `Choose 1 to ${MAX_SEATS} valid seats` });
    }

    const show = await Show.findOne({ showId }).select("showdate showtime").lean();
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });
    if (showStart(show) <= new Date()) {
      return res.status(400).json({ success: false, message: "This show has already started" });
    }

    const email = req.user.email;
    const now = Date.now();
    const expires = now + LOCK_MINUTES * 60 * 1000;

    // free any older locks this user holds on this show
    await releaseUserLocks(showId, email, seats);

    // ONE atomic update: it only matches if EVERY seat is free,
    // already held by this user, or held by someone whose lock has expired
    const filter = {
      showId,
      $and: seats.map((s) => ({
        $or: [
          { [`tickets.${s}.status`]: "available" },
          { [`tickets.${s}.status`]: "locked", [`tickets.${s}.lockedBy`]: email },
          { [`tickets.${s}.status`]: "locked", [`tickets.${s}.lockExpires`]: { $lt: now } },
        ],
      })),
    };
    const set = {};
    seats.forEach((s) => {
      set[`tickets.${s}.status`] = "locked";
      set[`tickets.${s}.lockedBy`] = email;
      set[`tickets.${s}.lockExpires`] = expires;
    });

    const result = await Show.updateOne(filter, { $set: set });
    if (result.matchedCount === 0) {
      return res.status(409).json({ success: false, message: "One or more of these seats are no longer available" });
    }

    notifySeats(req, showId);
    res.json({ success: true, message: "Seats held for you", expiresAt: expires });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/bookings/release   body: { showId }
const releaseSeats = async (req, res) => {
  try {
    if (!req.body.showId) return res.status(400).json({ success: false, message: "showId is required" });
    await releaseUserLocks(req.body.showId, req.user.email);
    notifySeats(req, req.body.showId);
    res.json({ success: true, message: "Seats released" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- 2. checkout (creates pending booking + payment order) ----------
// POST /api/bookings/checkout   body: { showId, seats }
const checkout = async (req, res) => {
  try {
    const { showId } = req.body;
    const seats = parseSeats(req.body.seats);
    if (!showId || !seats) {
      return res.status(400).json({ success: false, message: `Choose 1 to ${MAX_SEATS} valid seats` });
    }

    const show = await Show.findOne({ showId }).lean();
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });
    if (showStart(show) <= new Date()) {
      return res.status(400).json({ success: false, message: "This show has already started" });
    }

    const email = req.user.email;
    const now = Date.now();
    const chosen = [];

    for (const id of seats) {
      const t = show.tickets?.[id];
      if (!t || t.status !== "locked" || t.lockedBy !== email || t.lockExpires <= now) {
        return res.status(409).json({ success: false, message: "Your seat hold expired. Please select the seats again" });
      }
      chosen.push({ seatId: id, class: t.class, price: t.price });
    }

    // the price is always calculated on the server, never trusted from the client
    const amount = chosen.reduce((sum, c) => sum + c.price, 0);

    await Booking.updateMany({ userEmail: email, showId, status: "pending" }, { status: "expired" });

    const bookingId = crypto.randomUUID();
    const order = await createOrder(amount, bookingId);

    await Booking.create({
      bookingId,
      userEmail: email,
      showId,
      ticketsData: { seats: chosen },
      amount,
      status: "pending",
      orderId: order.id,
    });

    const expiresAt = Math.min(...seats.map((id) => show.tickets[id].lockExpires));

    res.status(201).json({
      success: true,
      booking: { bookingId, amount, seats: chosen },
      order,
      mock: !!order.mock,
      keyId: order.mock ? null : process.env.RAZORPAY_KEY_ID,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- 3. confirm after payment ----------
// POST /api/bookings/confirm
// body: { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
const confirmBooking = async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const email = req.user.email;

    const booking = await Booking.findOne({ bookingId, userEmail: email });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.status === "confirmed") {
      return res.json({ success: true, message: "Booking already confirmed", booking });
    }
    if (booking.status !== "pending") {
      return res.status(409).json({ success: false, message: `This booking is ${booking.status}` });
    }

    const paid =
      razorpay_order_id === booking.orderId &&
      verifyPayment({ orderId: booking.orderId, paymentId: razorpay_payment_id, signature: razorpay_signature });

    if (!paid) {
      booking.status = "failed";
      await booking.save();
      await releaseUserLocks(booking.showId, email);
      notifySeats(req, booking.showId);
      return res.status(400).json({ success: false, message: "Payment could not be verified" });
    }

    // turn the locked seats into booked seats (only if this user still holds the locks)
    const seatIds = booking.ticketsData.seats.map((s) => s.seatId);
    const set = {};
    const unset = {};
    seatIds.forEach((id) => {
      set[`tickets.${id}.status`] = "booked";
      set[`tickets.${id}.bookedBy`] = email;
      set[`tickets.${id}.bookingId`] = booking.bookingId;
      unset[`tickets.${id}.lockedBy`] = "";
      unset[`tickets.${id}.lockExpires`] = "";
    });

    const result = await Show.updateOne(
      {
        showId: booking.showId,
        $and: seatIds.map((id) => ({
          [`tickets.${id}.status`]: "locked",
          [`tickets.${id}.lockedBy`]: email,
        })),
      },
      { $set: set, $unset: unset }
    );

    if (result.matchedCount === 0) {
      // very rare: the hold was lost while paying -> refund
      const r = await refund(razorpay_payment_id, booking.amount);
      booking.status = "failed";
      booking.paymentId = razorpay_payment_id;
      booking.refundStatus = r.status;
      await booking.save();
      return res.status(409).json({
        success: false,
        message: "Your seats were released before payment finished. Your payment will be refunded",
      });
    }

    booking.status = "confirmed";
    booking.paymentId = razorpay_payment_id;
    booking.paidAt = new Date();
    await booking.save();

    notifySeats(req, booking.showId);

    // send the email in the background, do not make the user wait
    emailDetails(booking)
      .then((d) => sendBookingConfirmation(booking.userEmail, d))
      .catch(() => {});

    res.json({ success: true, message: "Booking confirmed", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- payment failed or cancelled ----------
// POST /api/bookings/fail   body: { bookingId }
const failBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.body.bookingId, userEmail: req.user.email });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.status === "pending") {
      booking.status = "failed";
      await booking.save();
    }
    await releaseUserLocks(booking.showId, req.user.email);
    notifySeats(req, booking.showId);

    res.json({ success: true, message: "Payment cancelled, seats released" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- cancel a confirmed booking ----------
// PUT /api/bookings/:bookingId/cancel   (owner or admin)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId });
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && booking.userEmail !== req.user.email) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Only confirmed bookings can be cancelled" });
    }

    const show = await Show.findOne({ showId: booking.showId }).select("showdate showtime").lean();
    if (!isAdmin && show && showStart(show) <= new Date()) {
      return res.status(400).json({ success: false, message: "The show has already started, it cannot be cancelled" });
    }

    if (show) {
      const seatIds = booking.ticketsData.seats.map((s) => s.seatId);
      const set = {};
      const unset = {};
      seatIds.forEach((id) => {
        set[`tickets.${id}.status`] = "available";
        unset[`tickets.${id}.bookedBy`] = "";
        unset[`tickets.${id}.bookingId`] = "";
      });
      await Show.updateOne(
        { showId: booking.showId, $and: seatIds.map((id) => ({ [`tickets.${id}.bookingId`]: booking.bookingId })) },
        { $set: set, $unset: unset }
      );
    }

    const r = await refund(booking.paymentId, booking.amount);
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.refundStatus = r.status;
    await booking.save();

    notifySeats(req, booking.showId);
    emailDetails(booking)
      .then((d) => sendCancellation(booking.userEmail, d))
      .catch(() => {});

    res.json({ success: true, message: "Booking cancelled", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- history ----------
// GET /api/bookings/my?type=upcoming|past&page=1&limit=10
const myBookings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const list = await Booking.find({
      userEmail: req.user.email,
      status: { $in: ["confirmed", "cancelled"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    const all = await enrich(list);

    const start = (b) => new Date(`${b.show.showdate}T${b.show.showtime}:00`);
    const now = new Date();
    const isUpcoming = (b) => b.status === "confirmed" && b.show && start(b) > now;

    let items = all;
    if (req.query.type === "upcoming") items = all.filter(isUpcoming).sort((a, b) => start(a) - start(b));
    else if (req.query.type === "past") items = all.filter((b) => !isUpcoming(b));

    const total = items.length;
    res.json({
      success: true,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      bookings: items.slice((page - 1) * limit, page * limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/:bookingId   (owner or admin)
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).lean();
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (req.user.role !== "admin" && booking.userEmail !== req.user.email) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    const [full] = await enrich([booking]);
    res.json({ success: true, booking: full });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------- admin ----------
// GET /api/bookings?status=&showId=&search=&page=1&limit=10
const adminListBookings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.showId) filter.showId = req.query.showId;
    if (req.query.search) filter.userEmail = { $regex: escapeRegex(req.query.search), $options: "i" };

    const total = await Booking.countDocuments(filter);
    const list = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ success: true, total, page, pages: Math.max(Math.ceil(total / limit), 1), bookings: await enrich(list) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/admin/report   -> revenue numbers for the dashboard charts
const adminReport = async (req, res) => {
  try {
    const confirmed = await Booking.find({ status: "confirmed" }).select("showId amount createdAt").lean();

    const shows = await Show.find({ showId: { $in: [...new Set(confirmed.map((b) => b.showId))] } })
      .select("showId movieId")
      .lean();
    const showMap = {};
    shows.forEach((s) => (showMap[s.showId] = s.movieId));

    const movies = await Movie.find({ movieId: { $in: [...new Set(Object.values(showMap))] } })
      .select("movieId movieName")
      .lean();
    const nameMap = {};
    movies.forEach((m) => (nameMap[m.movieId] = m.movieName));

    const byMovie = {};
    let totalRevenue = 0;
    confirmed.forEach((b) => {
      totalRevenue += b.amount;
      const name = nameMap[showMap[b.showId]] || "Deleted movie";
      byMovie[name] = byMovie[name] || { movieName: name, revenue: 0, bookings: 0 };
      byMovie[name].revenue += b.amount;
      byMovie[name].bookings += 1;
    });

    // last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push({ date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), bookings: 0, revenue: 0 });
    }
    confirmed.forEach((b) => {
      const d = days.find((x) => x.date === b.createdAt.toISOString().slice(0, 10));
      if (d) {
        d.bookings += 1;
        d.revenue += b.amount;
      }
    });

    res.json({
      success: true,
      totalRevenue,
      totalBookings: confirmed.length,
      revenueByMovie: Object.values(byMovie).sort((a, b) => b.revenue - a.revenue),
      bookingsByDay: days,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  lockSeats,
  releaseSeats,
  checkout,
  confirmBooking,
  failBooking,
  cancelBooking,
  myBookings,
  getBooking,
  adminListBookings,
  adminReport,
};
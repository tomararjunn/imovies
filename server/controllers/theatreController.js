const crypto = require("crypto");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");
const { isValidBlock } = require("../utils/seatLayout");

// POST /api/theatre  (admin)
const addTheatre = async (req, res) => {
  try {
    const {
      theatreName, location,
      balconySeatPrice, middleSeatPrice, lowerSeatPrice,
      balconySeats, middleSeats, lowerSeats,
    } = req.body;

    if (!theatreName || !location) {
      return res.status(400).json({ success: false, message: "Theatre name and location are required" });
    }

    const prices = [balconySeatPrice, middleSeatPrice, lowerSeatPrice];
    if (prices.some((p) => typeof p !== "number" || p < 0)) {
      return res.status(400).json({ success: false, message: "All three seat prices must be numbers (0 or more)" });
    }

    const blocks = [balconySeats, middleSeats, lowerSeats];
    if (!blocks.every(isValidBlock)) {
      return res.status(400).json({
        success: false,
        message: 'Each seat block must look like { "rows": ["A","B"], "cols": 8 } (cols 1-30)',
      });
    }

    // Row letters must be unique across all three blocks
    const allRows = blocks.flatMap((b) => b.rows);
    if (new Set(allRows).size !== allRows.length) {
      return res.status(400).json({ success: false, message: "Row letters must be unique across balcony, middle and lower" });
    }

    const exists = await Theatre.findOne({ theatreName });
    if (exists) {
      return res.status(409).json({ success: false, message: "A theatre with this name already exists" });
    }

    const theatre = await Theatre.create({
      theatreId: crypto.randomUUID(),
      theatreName,
      location,
      adminName: req.user.username,
      balconySeatPrice,
      middleSeatPrice,
      lowerSeatPrice,
      balconySeats,
      middleSeats,
      lowerSeats,
    });

    res.status(201).json({ success: true, message: "Theatre added", theatre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/theatre?location=
const getTheatres = async (req, res) => {
  try {
    const filter = {};
    if (req.query.location) {
      const safe = req.query.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.location = { $regex: safe, $options: "i" };
    }
    const theatres = await Theatre.find(filter).sort({ theatreName: 1 });
    res.json({ success: true, total: theatres.length, theatres });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/theatre/:theatreId
const getTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findOne({ theatreId: req.params.theatreId });
    if (!theatre) return res.status(404).json({ success: false, message: "Theatre not found" });
    res.json({ success: true, theatre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/theatre/:theatreId  (admin)
// Only location and prices can change. Name and seat layout are fixed,
// because existing shows are built from them.
const updateTheatre = async (req, res) => {
  try {
    const allowed = ["location", "balconySeatPrice", "middleSeatPrice", "lowerSeatPrice"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const theatre = await Theatre.findOneAndUpdate({ theatreId: req.params.theatreId }, updates, {
      new: true,
      runValidators: true,
    });
    if (!theatre) return res.status(404).json({ success: false, message: "Theatre not found" });

    res.json({ success: true, message: "Theatre updated (applies to new shows only)", theatre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/theatre/:theatreId  (admin)
const deleteTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findOne({ theatreId: req.params.theatreId });
    if (!theatre) return res.status(404).json({ success: false, message: "Theatre not found" });

    const hasShows = await Show.exists({ theatreName: theatre.theatreName });
    if (hasShows) {
      return res.status(409).json({ success: false, message: "Delete this theatre's shows first" });
    }

    await theatre.deleteOne();
    res.json({ success: true, message: "Theatre deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addTheatre, getTheatres, getTheatre, updateTheatre, deleteTheatre };
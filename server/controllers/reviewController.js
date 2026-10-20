const Review = require("../models/reviewModel");
const Movie = require("../models/movieModel");

// POST /api/review/:movieId   body: { rating: 1-5, comment }  (adds OR updates your review)
const saveReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || "").toString();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a whole number from 1 to 5" });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ success: false, message: "Comment cannot exceed 1000 characters" });
    }

    const movie = await Movie.findOne({ movieId: req.params.movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    const review = await Review.findOneAndUpdate(
      { user: req.user.id, movie: movie._id },
      { rating, comment },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: "Review saved", review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/review/movie/:movieId?page=1&limit=10
const getMovieReviews = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const movie = await Movie.findOne({ movieId: req.params.movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    const stats = await Review.aggregate([
      { $match: { movie: movie._id } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const reviews = await Review.find({ movie: movie._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username")
      .lean();

    const mine =
      req.user.role === "user" ? await Review.findOne({ movie: movie._id, user: req.user.id }).lean() : null;

    const count = stats[0]?.count || 0;
    res.json({
      success: true,
      average: stats[0] ? Math.round(stats[0].average * 10) / 10 : 0,
      count,
      page,
      pages: Math.max(Math.ceil(count / limit), 1),
      reviews,
      mine,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/review?page=1&limit=10   (admin moderation list)
const adminListReviews = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const total = await Review.countDocuments();
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username")
      .populate("movie", "movieName")
      .lean();

    res.json({ success: true, total, page, pages: Math.max(Math.ceil(total / limit), 1), reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/review/:reviewId   (the author, or any admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    const isOwner = review.user.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ success: false, message: "You can only delete your own review" });
    }

    await review.deleteOne();
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { saveReview, getMovieReviews, adminListReviews, deleteReview };
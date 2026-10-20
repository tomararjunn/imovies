const Favorite = require("../models/favoriteModel");
const Movie = require("../models/movieModel");

// POST /api/favorite/:movieId
const addFavorite = async (req, res) => {
  try {
    const movie = await Movie.findOne({ movieId: req.params.movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    try {
      await Favorite.create({ userEmail: req.user.email, movieId: movie.movieId });
    } catch (err) {
      if (err.code !== 11000) throw err; // already a favorite is fine
    }
    res.status(201).json({ success: true, message: "Added to favorites" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/favorite/:movieId
const removeFavorite = async (req, res) => {
  try {
    await Favorite.deleteOne({ userEmail: req.user.email, movieId: req.params.movieId });
    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/favorite   -> list of favorite movies
const getFavorites = async (req, res) => {
  try {
    const favs = await Favorite.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).lean();
    const movies = await Movie.find({ movieId: { $in: favs.map((f) => f.movieId) } }).lean();

    const map = {};
    movies.forEach((m) => (map[m.movieId] = m));
    const ordered = favs.map((f) => map[f.movieId]).filter(Boolean);

    res.json({ success: true, total: ordered.length, movies: ordered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/favorite/check/:movieId
const checkFavorite = async (req, res) => {
  try {
    const exists = await Favorite.exists({ userEmail: req.user.email, movieId: req.params.movieId });
    res.json({ success: true, isFavorite: !!exists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addFavorite, removeFavorite, getFavorites, checkFavorite };
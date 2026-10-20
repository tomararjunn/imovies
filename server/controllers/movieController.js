const crypto = require("crypto");
const Movie = require("../models/movieModel");
const Show = require("../models/showModel");
const Theatre = require("../models/theatreModel");
const Favorite = require("../models/favoriteModel");
const Review = require("../models/reviewModel");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FIELDS = ["movieName", "description", "genres", "language", "releaseDate", "runtime", "certification", "cast", "media"];
const pick = (body) => {
  const out = {};
  FIELDS.forEach((f) => {
    if (body[f] !== undefined) out[f] = body[f];
  });
  return out;
};

const sendValidation = (err, res) => {
  const message = Object.values(err.errors).map((e) => e.message).join(", ");
  return res.status(400).json({ success: false, message });
};

// POST /api/movie  (admin)
const addMovie = async (req, res) => {
  try {
    const movie = await Movie.create({ movieId: crypto.randomUUID(), ...pick(req.body) });
    res.status(201).json({ success: true, message: "Movie added", movie });
  } catch (err) {
    if (err.name === "ValidationError") return sendValidation(err, res);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/movie?search=&genre=&language=&certification=&theatre=&location=&date=&page=1&limit=10
const getMovies = async (req, res) => {
  try {
    const { search, genre, language, certification, theatre, location, date } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const filter = {};
    if (search) filter.movieName = { $regex: escapeRegex(search), $options: "i" };
    if (genre) filter.genres = { $regex: `^${escapeRegex(genre)}$`, $options: "i" };
    if (language) filter.language = { $regex: `^${escapeRegex(language)}$`, $options: "i" };
    if (certification) filter.certification = certification;

    // theatre / location / date filters work through the shows
    if (theatre || location || date) {
      const showFilter = {};
      if (date) showFilter.showdate = date;

      if (theatre || location) {
        const theatreFilter = {};
        if (theatre) theatreFilter.theatreName = { $regex: `^${escapeRegex(theatre)}$`, $options: "i" };
        if (location) theatreFilter.location = { $regex: `^${escapeRegex(location)}$`, $options: "i" };
        const theatres = await Theatre.find(theatreFilter).select("theatreName").lean();
        showFilter.theatreName = { $in: theatres.map((t) => t.theatreName) };
      }

      filter.movieId = { $in: await Show.distinct("movieId", showFilter) };
    }

    const total = await Movie.countDocuments(filter);
    const movies = await Movie.find(filter)
      .sort({ releaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, total, page, pages: Math.max(Math.ceil(total / limit), 1), movies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/movie/filters/options   -> values for the filter dropdowns
const getFilterOptions = async (req, res) => {
  try {
    const [genres, languages, certifications, theatres] = await Promise.all([
      Movie.distinct("genres"),
      Movie.distinct("language"),
      Movie.distinct("certification"),
      Theatre.find().select("theatreName location").lean(),
    ]);

    res.json({
      success: true,
      genres: genres.filter(Boolean).sort(),
      languages: languages.filter(Boolean).sort(),
      certifications: certifications.filter(Boolean).sort(),
      theatres: theatres.map((t) => t.theatreName).sort(),
      locations: [...new Set(theatres.map((t) => t.location))].sort(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/movie/:movieId
const getMovie = async (req, res) => {
  try {
    const movie = await Movie.findOne({ movieId: req.params.movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
    res.json({ success: true, movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/movie/:movieId  (admin)
const updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findOneAndUpdate({ movieId: req.params.movieId }, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });
    res.json({ success: true, message: "Movie updated", movie });
  } catch (err) {
    if (err.name === "ValidationError") return sendValidation(err, res);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/movie/:movieId  (admin) - also removes its shows, favorites and reviews
const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findOneAndDelete({ movieId: req.params.movieId });
    if (!movie) return res.status(404).json({ success: false, message: "Movie not found" });

    await Show.deleteMany({ movieId: movie.movieId });
    await Favorite.deleteMany({ movieId: movie.movieId });
    await Review.deleteMany({ movie: movie._id });

    res.json({ success: true, message: "Movie and its shows deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addMovie, getMovies, getFilterOptions, getMovie, updateMovie, deleteMovie };
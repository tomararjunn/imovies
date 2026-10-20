const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    movieId: { type: String, required: true, unique: true },
    movieName: {
      type: String,
      required: [true, "Movie name is required"],
      trim: true,
      minlength: [2, "Movie name must be at least 2 characters"],
      maxlength: [200, "Movie name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
    },
    genres: {
      type: [String],
      required: [true, "At least one genre is required"],
      validate: {
        validator: (g) => Array.isArray(g) && g.length > 0,
        message: "At least one genre is required",
      },
    },
    language: { type: String, trim: true },
    releaseDate: {
      type: Date,
      required: [true, "Release date is required"],
      validate: {
        validator: (d) => d instanceof Date && !isNaN(d),
        message: "Invalid release date",
      },
    },
    runtime: { type: Number }, // minutes
    certification: { type: String }, // U, UA, A
    cast: { type: [String], default: [] },
    media: { type: [String], default: [] }, // poster / image URLs
  },
  { timestamps: true }
);

movieSchema.index({ movieName: "text" });
movieSchema.index({ genres: 1 });
movieSchema.index({ language: 1 });
movieSchema.index({ releaseDate: -1 });

module.exports = mongoose.model("Movie", movieSchema);
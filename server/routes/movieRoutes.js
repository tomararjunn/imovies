const express = require("express");
const router = express.Router();
const {
  addMovie,
  getMovies,
  getFilterOptions,
  getMovie,
  updateMovie,
  deleteMovie,
} = require("../controllers/movieController");
const { fetchUser, adminOnly } = require("../middlewares/fetchUser");

router.get("/", fetchUser, getMovies);
// must stay ABOVE "/:movieId"
router.get("/filters/options", fetchUser, getFilterOptions);
router.get("/:movieId", fetchUser, getMovie);

router.post("/", fetchUser, adminOnly, addMovie);
router.put("/:movieId", fetchUser, adminOnly, updateMovie);
router.delete("/:movieId", fetchUser, adminOnly, deleteMovie);

module.exports = router;
const express = require("express");
const router = express.Router();
const { saveReview, getMovieReviews, adminListReviews, deleteReview } = require("../controllers/reviewController");
const { fetchUser, adminOnly, userOnly } = require("../middlewares/fetchUser");

router.get("/", fetchUser, adminOnly, adminListReviews);
router.get("/movie/:movieId", fetchUser, getMovieReviews);
router.post("/:movieId", fetchUser, userOnly, saveReview);
router.delete("/:reviewId", fetchUser, deleteReview);

module.exports = router;
const express = require("express");
const router = express.Router();
const { addShow, getShows, getMovieShows, getShow, updateShow, deleteShow } = require("../controllers/showController");
const { fetchUser, adminOnly } = require("../middlewares/fetchUser");

router.get("/", fetchUser, getShows);
// This must stay ABOVE "/:showId", or "getmovieshows" would be read as a show id
router.get("/getmovieshows/:movieName", fetchUser, getMovieShows);
router.get("/:showId", fetchUser, getShow);

router.post("/", fetchUser, adminOnly, addShow);
router.put("/:showId", fetchUser, adminOnly, updateShow);
router.delete("/:showId", fetchUser, adminOnly, deleteShow);

module.exports = router;
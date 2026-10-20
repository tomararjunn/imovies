const express = require("express");
const router = express.Router();
const { addFavorite, removeFavorite, getFavorites, checkFavorite } = require("../controllers/favoriteController");
const { fetchUser, userOnly } = require("../middlewares/fetchUser");

router.get("/", fetchUser, userOnly, getFavorites);
router.get("/check/:movieId", fetchUser, userOnly, checkFavorite);
router.post("/:movieId", fetchUser, userOnly, addFavorite);
router.delete("/:movieId", fetchUser, userOnly, removeFavorite);

module.exports = router;
const express = require("express");
const router = express.Router();
const { addTheatre, getTheatres, getTheatre, updateTheatre, deleteTheatre } = require("../controllers/theatreController");
const { fetchUser, adminOnly } = require("../middlewares/fetchUser");

router.get("/", fetchUser, getTheatres);
router.get("/:theatreId", fetchUser, getTheatre);

router.post("/", fetchUser, adminOnly, addTheatre);
router.put("/:theatreId", fetchUser, adminOnly, updateTheatre);
router.delete("/:theatreId", fetchUser, adminOnly, deleteTheatre);

module.exports = router;
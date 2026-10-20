// 404 for unknown API routes
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// One place that turns every error into { success, message }
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ success: false, message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid value for " + err.path });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate value, this record already exists" });
  }
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
};

module.exports = { notFound, errorHandler };
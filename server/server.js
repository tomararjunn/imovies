const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config({ path: "./.env" });

const dns = require("dns");
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");

const { verifyTransport } = require("./utils/mailer");
const { sendReminderEmails } = require("./utils/reminderService");
const { cleanupOldBookings } = require("./utils/cleanupService");

const requestLogger = require("./middlewares/requestLogger");
const sanitize = require("./middlewares/sanitize");
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiter");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const movieRoutes = require("./routes/movieRoutes");
const theatreRoutes = require("./routes/theatreRoutes");
const showRoutes = require("./routes/showRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();
const server = http.createServer(app);

// needed when deployed behind a proxy (Render, Heroku...) so rate limiting sees real IPs
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(requestLogger);
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "1mb" }));
app.use(sanitize);

app.get("/", (req, res) => {
  res.json({ success: true, message: "IMovies API is running" });
});

// rate limits
app.use("/api", apiLimiter);
app.use(
  ["/api/auth/login", "/api/auth/register", "/api/auth/admin/login", "/api/auth/admin/register"],
  authLimiter
);

// routes (admin first, because its path starts with /api/auth too)
app.use("/api/auth/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/movie", movieRoutes);
app.use("/api/theatre", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/favorite", favoriteRoutes);
app.use("/api/review", reviewRoutes);

app.use(notFound);
app.use(errorHandler);

// OPTIONAL Step 15: live seat updates. Needs `npm install socket.io` and ENABLE_SOCKET=true in .env
if (process.env.ENABLE_SOCKET === "true") {
  try {
    app.set("io", require("./utils/socket")(server));
    console.log("Socket.io enabled");
  } catch (err) {
    console.error("Socket.io could not start. Run: npm install socket.io", err.message);
  }
}

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    await verifyTransport();

    // reminder emails every hour, cleanup every 15 minutes
    cron.schedule("0 * * * *", () =>
      sendReminderEmails().catch((e) => console.error("Reminder job failed:", e.message))
    );
    cron.schedule("*/15 * * * *", () =>
      cleanupOldBookings().catch((e) => console.error("Cleanup job failed:", e.message))
    );

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
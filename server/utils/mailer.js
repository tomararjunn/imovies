const nodemailer = require("nodemailer");

let transporter = null;
const configured = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!configured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail", // use a Gmail "App Password" in EMAIL_PASS
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
};

// Called once at startup
const verifyTransport = async () => {
  const t = getTransporter();
  if (!t) {
    console.log("Email not configured: emails will only be logged in the console");
    return false;
  }
  try {
    await t.verify();
    console.log("Email transport ready");
    return true;
  } catch (err) {
    console.error("Email transport error:", err.message);
    return false;
  }
};

// Never throws, so a mail problem can never break a booking
const sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[email not sent - not configured] to=${to} | ${subject}`);
    return false;
  }
  try {
    await t.sendMail({ from: `"IMovies" <${process.env.EMAIL_USER}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("Email send failed:", err.message);
    return false;
  }
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const to12h = (t = "") => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const ticketTable = (d) => `
  <table style="border-collapse:collapse;font-family:Arial,sans-serif">
    <tr><td style="padding:4px 12px 4px 0"><b>Movie</b></td><td>${esc(d.movieName)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Theatre</b></td><td>${esc(d.theatreName)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Date</b></td><td>${esc(d.showdate)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Time</b></td><td>${esc(to12h(d.showtime))}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Seats</b></td><td>${esc(d.seats.join(", "))}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Amount</b></td><td>Rs. ${esc(d.amount)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0"><b>Booking ID</b></td><td>${esc(d.bookingId)}</td></tr>
  </table>`;

const sendBookingConfirmation = (to, d) =>
  sendMail({
    to,
    subject: `Booking confirmed: ${d.movieName}`,
    html: `<h2>Your booking is confirmed</h2><p>Payment received. Show this e-ticket at the theatre.</p>${ticketTable(d)}`,
  });

const sendCancellation = (to, d) =>
  sendMail({
    to,
    subject: `Booking cancelled: ${d.movieName}`,
    html: `<h2>Your booking was cancelled</h2><p>Refund status: ${esc(d.refundStatus)}</p>${ticketTable(d)}`,
  });

const sendReminder = (to, d) =>
  sendMail({
    to,
    subject: `Reminder: ${d.movieName} is coming up`,
    html: `<h2>Your show starts soon</h2>${ticketTable(d)}`,
  });

module.exports = { verifyTransport, sendMail, sendBookingConfirmation, sendCancellation, sendReminder };
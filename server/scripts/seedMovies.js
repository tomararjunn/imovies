// Fills your database with real movies (poster, cast, genres, runtime...) from TMDB,
// 4 theatres, and shows for the next 5 days, so the app looks full straight away.
// Run it once:   node scripts/seedMovies.js
// Safe to run again: existing movies, theatres and shows are skipped.
require("dotenv").config({ path: "./.env" });

const dns = require("dns");
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");

const crypto = require("crypto");
const mongoose = require("mongoose");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");
const Admin = require("../models/adminModel");
const { buildTickets } = require("../utils/seatLayout");

const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error("Add TMDB_API_KEY=your_key to server/.env first.");
  process.exit(1);
}
const isToken = KEY.length > 40; // long "Read Access Token" or short "API Key": both work

// Movies to add. Change this list as you like.
const WANTED = [
  { q: "RRR", year: 2022 },
  { q: "Baahubali 2: The Conclusion", year: 2017 },
  { q: "They Call Him OG", year: 2025 },
  { q: "The Raja Saab" },
  { q: "Toxic: A Fairy Tale for Grown-Ups" },
  { q: "Avatar: Fire and Ash", year: 2025 },
  { q: "Baaghi 4", year: 2025 },
  { q: "Leo", year: 2023 },
  { q: "Pushpa 2: The Rule", year: 2024 },
  { q: "KGF: Chapter 2", year: 2022 },
  { q: "Kalki 2898 AD", year: 2024 },
  { q: "Jawan", year: 2023 },
  { q: "Inception", year: 2010 },
];

const THEATRES = [
  { theatreName: "PVR Cinemas", location: "Mumbai" },
  { theatreName: "INOX Megaplex", location: "Hyderabad" },
  { theatreName: "Cinepolis Heights", location: "Bengaluru" },
  { theatreName: "Carnival Cinemas", location: "Delhi" },
];

const SLOTS = ["10:00", "14:00", "18:30", "21:30"];
const DAYS = 5;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tmdb = async (path, params = {}) => {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers = {};
  if (isToken) headers.Authorization = `Bearer ${KEY}`;
  else url.searchParams.set("api_key", KEY);

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB answered ${res.status}. Check your TMDB_API_KEY`);
  return res.json();
};

const searchMovie = async ({ q, year }) => {
  const attempts = year ? [{ query: q, year }, { query: q }] : [{ query: q }];
  for (const params of attempts) {
    const r = await tmdb("/search/movie", { ...params, include_adult: "false", language: "en-US" });
    const hit = (r.results || []).find((m) => m.poster_path);
    if (hit) return hit;
  }
  return null;
};

const certificationOf = (d) => {
  const results = d.release_dates?.results || [];
  const find = (country) =>
    results
      .find((r) => r.iso_3166_1 === country)
      ?.release_dates.map((x) => x.certification)
      .find(Boolean);

  const indian = find("IN");
  if (indian) {
    const c = indian.toUpperCase();
    if (c.startsWith("UA")) return "UA";
    if (c === "U") return "U";
    if (c === "S") return "S";
    if (c.startsWith("A")) return "A";
  }
  const map = { G: "U", PG: "U", "PG-13": "UA", R: "A", "NC-17": "A" };
  return map[find("US")] || "UA";
};

const toMovieData = (d) => ({
  movieName: d.title,
  description: d.overview && d.overview.length >= 10 ? d.overview : "No description available yet.",
  genres: d.genres?.length ? d.genres.map((g) => g.name) : ["Drama"],
  language:
    d.spoken_languages?.find((l) => l.iso_639_1 === d.original_language)?.english_name ||
    d.spoken_languages?.[0]?.english_name ||
    "English",
  releaseDate: d.release_date || new Date().toISOString().slice(0, 10),
  runtime: d.runtime || undefined,
  certification: certificationOf(d),
  cast: (d.credits?.cast || []).slice(0, 6).map((c) => c.name),
  media: [`https://image.tmdb.org/t/p/w500${d.poster_path}`],
});

const dateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  // ---------- movies ----------
  const movies = [];
  for (const item of WANTED) {
    try {
      const found = await searchMovie(item);
      if (!found) {
        console.log(`NOT FOUND on TMDB: ${item.q}  (add it yourself in Admin > Add Movie)`);
        continue;
      }
      const details = await tmdb(`/movie/${found.id}`, { append_to_response: "credits,release_dates", language: "en-US" });
      const data = toMovieData(details);

      let doc = await Movie.findOne({ movieName: new RegExp(`^${escapeRegex(data.movieName)}$`, "i") });
      if (doc) {
        if (!doc.media || doc.media.length === 0) {
          doc.media = data.media;
          if (!doc.cast?.length) doc.cast = data.cast;
          await doc.save();
          console.log(`Poster added to existing movie: ${doc.movieName}`);
        } else {
          console.log(`Already exists: ${doc.movieName}`);
        }
      } else {
        doc = await Movie.create({ movieId: crypto.randomUUID(), ...data });
        console.log(`Added: ${doc.movieName}`);
      }
      movies.push(doc);
    } catch (err) {
      console.log(`Failed for ${item.q}: ${err.message}`);
    }
  }

  // ---------- theatres ----------
  const adminDoc = await Admin.findOne();
  const adminEmail = adminDoc?.email || "admin@test.com";

  const theatres = [];
  for (const t of THEATRES) {
    let doc = await Theatre.findOne({ theatreName: t.theatreName });
    if (!doc) {
      doc = await Theatre.create({
        theatreId: crypto.randomUUID(),
        theatreName: t.theatreName,
        location: t.location,
        adminName: adminDoc?.username || "admin",
        balconySeatPrice: 300,
        middleSeatPrice: 200,
        lowerSeatPrice: 120,
        balconySeats: { rows: ["A", "B"], cols: 8 },
        middleSeats: { rows: ["C", "D"], cols: 10 },
        lowerSeats: { rows: ["E", "F"], cols: 10 },
      });
      console.log(`Theatre added: ${doc.theatreName}`);
    }
    theatres.push(doc);
  }

  // ---------- shows (next 5 days, 2 shows per movie per day) ----------
  let created = 0;
  for (let i = 0; i < movies.length; i++) {
    const combos = [
      [theatres[Math.floor(i / 4) % theatres.length], SLOTS[i % 4]],
      [theatres[(Math.floor(i / 4) + 1) % theatres.length], SLOTS[(i + 2) % 4]],
    ];

    for (let day = 1; day <= DAYS; day++) {
      const showdate = dateString(new Date(Date.now() + day * 86400000));
      for (const [theatre, showtime] of combos) {
        const exists = await Show.exists({ theatreName: theatre.theatreName, showdate, showtime });
        if (exists) continue;
        await Show.create({
          showId: crypto.randomUUID(),
          adminEmail,
          movieId: movies[i].movieId,
          theatreName: theatre.theatreName,
          showdate,
          showtime,
          tickets: buildTickets(theatre),
        });
        created++;
      }
    }
  }

  console.log(`\nDone. ${movies.length} movies ready, ${created} new shows created.`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
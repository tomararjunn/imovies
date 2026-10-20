import dayjs from "dayjs";

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

// "18:30" -> "6:30 PM"
export const to12h = (t = "") => {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export const formatDate = (d) => dayjs(d).format("DD MMM YYYY");

// "Mar 25, 2022" (used on movie cards)
export const formatCardDate = (d) => dayjs(d).format("MMM D, YYYY");

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// media can be a string, an array of strings, or { url } objects
export const getPoster = (media) => {
  let url;
  if (typeof media === "string") url = media;
  else if (Array.isArray(media) && media.length) {
    const first = media[0];
    url = typeof first === "string" ? first : first?.url;
  } else if (media?.url) url = media.url;
  return url || "/default-movie.svg";
};

// show date + time -> Date object
export const showStart = (date, time) => new Date(`${date}T${time}:00`);
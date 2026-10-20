import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import Pagination from "../../components/pagination/Pagination";
import MovieDetailsPopup from "./MovieDetailsPopup";
import { formatCardDate, formatDate, getErrorMessage, getPoster, money } from "../../utils/helpers";
import "./style.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const axisStyle = { ticks: { color: "#9aa0b8" }, grid: { color: "rgba(128,128,128,0.15)" } };
const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: "#9aa0b8" } } },
  scales: { x: axisStyle, y: { ...axisStyle, beginAtZero: true } },
};

export default function Admin() {
  const stats = useFetch("/api/auth/admin/stats");
  const report = useFetch("/api/bookings/admin/report");

  const [moviePage, setMoviePage] = useState(1);
  const movies = useFetch(`/api/movie?page=${moviePage}&limit=8`);
  const [reviewPage, setReviewPage] = useState(1);
  const reviews = useFetch(`/api/review?page=${reviewPage}&limit=5`);
  const users = useFetch("/api/auth/admin/users");

  const [popup, setPopup] = useState(null);

  const act = async (fn, okMessage) => {
    try {
      await fn();
      toast.success(okMessage);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  };

  const deleteMovie = async (m) => {
    if (!window.confirm(`Delete "${m.movieName}" and all its shows?`)) return;
    if (await act(() => api.delete(`/api/movie/${m.movieId}`), "Movie deleted")) {
      movies.refetch(true);
      stats.refetch(true);
    }
  };

  const deleteReview = async (r) => {
    if (!window.confirm("Delete this review?")) return;
    if (await act(() => api.delete(`/api/review/${r._id}`), "Review deleted")) reviews.refetch(true);
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    if (await act(() => api.delete(`/api/auth/admin/users/${u._id}`), "User deleted")) {
      users.refetch(true);
      stats.refetch(true);
    }
  };

  const s = stats.resData?.stats;
  const r = report.resData;

  return (
    <div className="page-wrap wide admin-page">
      <h1 className="hero-title">
        Admin <span>Dashboard</span>
      </h1>

      <div className="stat-grid mb-4">
        {[
          ["Users", s?.users],
          ["Movies", s?.movies],
          ["Theatres", s?.theatres],
          ["Shows", s?.shows],
          ["Bookings", s?.bookings],
          ["Revenue", s ? money(s.revenue) : undefined],
        ].map(([label, value]) => (
          <div className="card-dark stat" key={label}>
            <div className="num">{value ?? "-"}</div>
            <div className="text-muted-2">{label}</div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card-dark">
            <h5>Revenue by movie</h5>
            {!r ? (
              <Loader small />
            ) : r.revenueByMovie.length === 0 ? (
              <p className="text-muted-2">No confirmed bookings yet.</p>
            ) : (
              <Bar
                options={chartOptions}
                data={{
                  labels: r.revenueByMovie.map((m) => m.movieName),
                  datasets: [{ label: "Revenue (₹)", data: r.revenueByMovie.map((m) => m.revenue), backgroundColor: "#e11d48" }],
                }}
              />
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card-dark">
            <h5>Bookings in the last 7 days</h5>
            {!r ? (
              <Loader small />
            ) : (
              <Line
                options={chartOptions}
                data={{
                  labels: r.bookingsByDay.map((d) => d.date.slice(5)),
                  datasets: [
                    {
                      label: "Bookings",
                      data: r.bookingsByDay.map((d) => d.bookings),
                      borderColor: "#ffb703",
                      backgroundColor: "#ffb703",
                      tension: 0.3,
                    },
                  ],
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* movies */}
      <div className="card-dark mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="mb-0">Movies</h5>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/admin/add-movie" className="btn btn-accent btn-sm">+ Add movie</Link>
            <Link to="/admin/add-theatre" className="btn btn-outline-light btn-sm">+ Add theatre</Link>
            <Link to="/admin/add-show" className="btn btn-outline-light btn-sm">+ Add show</Link>
          </div>
        </div>

        {movies.loading ? (
          <Loader small />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Movie</th>
                  <th>Release</th>
                  <th>Genres</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movies.resData?.movies.map((m) => (
                  <tr key={m.movieId}>
                    <td>
                      <img
                        className="thumb"
                        src={getPoster(m.media)}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default-movie.svg";
                        }}
                      />
                    </td>
                    <td>{m.movieName}</td>
                    <td>{formatCardDate(m.releaseDate)}</td>
                    <td>{m.genres.join(", ")}</td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-outline-light me-1" onClick={() => setPopup(m)}>Details</button>
                      <Link className="btn btn-sm btn-outline-light me-1" to={`/admin/add-movie?edit=${m.movieId}`}>Edit</Link>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteMovie(m)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {movies.resData && <Pagination page={movies.resData.page} pages={movies.resData.pages} onChange={setMoviePage} />}
      </div>

      <div className="row g-4">
        {/* review moderation */}
        <div className="col-lg-6">
          <div className="card-dark h-100">
            <h5>Review moderation</h5>
            {reviews.loading ? (
              <Loader small />
            ) : !reviews.resData?.reviews.length ? (
              <p className="text-muted-2">No reviews yet.</p>
            ) : (
              reviews.resData.reviews.map((rv) => (
                <div key={rv._id} className="review-row">
                  <div>
                    <strong>{rv.user?.username || "Deleted user"}</strong> on <em>{rv.movie?.movieName || "Deleted movie"}</em> · {rv.rating}/5
                    {rv.comment && <div className="text-muted-2">{rv.comment}</div>}
                    <small className="text-muted-2">{formatDate(rv.createdAt)}</small>
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteReview(rv)}>Delete</button>
                </div>
              ))
            )}
            {reviews.resData && <Pagination page={reviews.resData.page} pages={reviews.resData.pages} onChange={setReviewPage} />}
          </div>
        </div>

        {/* users */}
        <div className="col-lg-6">
          <div className="card-dark h-100">
            <h5>Users ({users.resData?.total ?? "-"})</h5>
            {users.loading ? (
              <Loader small />
            ) : (
              <div className="table-responsive" style={{ maxHeight: 360 }}>
                <table className="table table-sm">
                  <tbody>
                    {users.resData?.users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.username}</td>
                        <td className="text-muted-2">{u.email}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {popup && <MovieDetailsPopup movie={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}
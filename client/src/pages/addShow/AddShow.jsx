import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { formatDate, getErrorMessage, to12h } from "../../utils/helpers";

export default function AddShow() {
  const movies = useFetch("/api/movie?limit=50");
  const theatres = useFetch("/api/theatre");
  const shows = useFetch("/api/shows");

  const [form, setForm] = useState({ movieId: "", theatreName: "", showdate: "", showtime: "18:00" });
  const [saving, setSaving] = useState(false);

  const movieName = useMemo(() => {
    const map = {};
    movies.resData?.movies.forEach((m) => (map[m.movieId] = m.movieName));
    return map;
  }, [movies.resData]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.movieId || !form.theatreName || !form.showdate || !form.showtime) {
      return toast.error("Fill in all the fields");
    }
    setSaving(true);
    try {
      await api.post("/api/shows", form);
      toast.success("Show added");
      shows.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm("Delete this show?")) return;
    try {
      await api.delete(`/api/shows/${s.showId}`);
      toast.success("Show deleted");
      shows.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (movies.loading || theatres.loading) return <Loader />;

  const noData = !movies.resData?.movies.length || !theatres.resData?.theatres.length;

  return (
    <div className="page-wrap" style={{ maxWidth: 950 }}>
      <h2 className="page-title">Add show</h2>

      {noData ? (
        <p className="text-muted-2">Add at least one movie and one theatre first.</p>
      ) : (
        <form className="card-dark mb-4" onSubmit={onSubmit} noValidate>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Movie</label>
              <select className="form-select" name="movieId" value={form.movieId} onChange={onChange}>
                <option value="">Choose a movie</option>
                {movies.resData.movies.map((m) => (
                  <option key={m.movieId} value={m.movieId}>{m.movieName}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Theatre</label>
              <select className="form-select" name="theatreName" value={form.theatreName} onChange={onChange}>
                <option value="">Choose a theatre</option>
                {theatres.resData.theatres.map((t) => (
                  <option key={t.theatreId} value={t.theatreName}>{t.theatreName} ({t.location})</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Date</label>
              <input className="form-control" type="date" name="showdate" min={dayjs().format("YYYY-MM-DD")} value={form.showdate} onChange={onChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Time</label>
              <input className="form-control" type="time" name="showtime" value={form.showtime} onChange={onChange} />
            </div>
          </div>
          <button className="btn btn-accent mt-4" disabled={saving}>
            {saving ? "Saving..." : "Add show"}
          </button>
        </form>
      )}

      <div className="card-dark">
        <h5>All shows</h5>
        {shows.loading ? (
          <Loader small />
        ) : !shows.resData?.shows.length ? (
          <p className="text-muted-2">No shows yet.</p>
        ) : (
          <div className="table-responsive" style={{ maxHeight: 440 }}>
            <table className="table table-sm">
              <thead>
                <tr><th>Movie</th><th>Theatre</th><th>Date</th><th>Time</th><th>Seats left</th><th></th></tr>
              </thead>
              <tbody>
                {shows.resData.shows.map((s) => (
                  <tr key={s.showId}>
                    <td>{movieName[s.movieId] || "Unknown"}</td>
                    <td>{s.theatreName}</td>
                    <td>{formatDate(s.showdate)}</td>
                    <td>{to12h(s.showtime)}</td>
                    <td>{s.availableSeats}/{s.totalSeats}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
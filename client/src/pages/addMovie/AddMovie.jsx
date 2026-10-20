import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { getErrorMessage } from "../../utils/helpers";

const EMPTY = {
  movieName: "",
  description: "",
  genres: "",
  language: "English",
  releaseDate: "",
  runtime: "",
  certification: "UA",
  cast: "",
  media: "",
};

const toList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function AddMovie() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");

  const existing = useFetch(editId ? `/api/movie/${editId}` : null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const m = existing.resData?.movie;
    if (!m) return;
    setForm({
      movieName: m.movieName,
      description: m.description,
      genres: m.genres.join(", "),
      language: m.language || "",
      releaseDate: (m.releaseDate || "").slice(0, 10),
      runtime: m.runtime || "",
      certification: m.certification || "UA",
      cast: (m.cast || []).join(", "),
      media: (m.media || []).join(", "),
    });
  }, [existing.resData]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    const genres = toList(form.genres);
    if (form.movieName.trim().length < 2) return toast.error("Movie name must be at least 2 characters");
    if (form.description.trim().length < 10) return toast.error("Description must be at least 10 characters");
    if (genres.length === 0) return toast.error("Add at least one genre");
    if (!form.releaseDate) return toast.error("Choose a release date");

    const body = {
      movieName: form.movieName.trim(),
      description: form.description.trim(),
      genres,
      language: form.language.trim(),
      releaseDate: form.releaseDate,
      runtime: form.runtime ? Number(form.runtime) : undefined,
      certification: form.certification,
      cast: toList(form.cast),
      media: toList(form.media),
    };

    setSaving(true);
    try {
      if (editId) await api.put(`/api/movie/${editId}`, body);
      else await api.post("/api/movie", body);
      toast.success(editId ? "Movie updated" : "Movie added");
      navigate("/admin");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (editId && existing.loading) return <Loader />;

  const poster = toList(form.media)[0];

  return (
    <div className="page-wrap" style={{ maxWidth: 820 }}>
      <h2 className="page-title">{editId ? "Edit movie" : "Add movie"}</h2>

      <form className="card-dark" onSubmit={onSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Movie name</label>
            <input className="form-control" name="movieName" value={form.movieName} onChange={onChange} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Release date</label>
            <input className="form-control" type="date" name="releaseDate" value={form.releaseDate} onChange={onChange} />
          </div>

          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="3" name="description" value={form.description} onChange={onChange} />
          </div>

          <div className="col-md-6">
            <label className="form-label">Genres (comma separated)</label>
            <input className="form-control" name="genres" value={form.genres} onChange={onChange} placeholder="Action, Drama" />
          </div>
          <div className="col-md-3">
            <label className="form-label">Language</label>
            <input className="form-control" name="language" value={form.language} onChange={onChange} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Runtime (minutes)</label>
            <input className="form-control" type="number" min="1" name="runtime" value={form.runtime} onChange={onChange} />
          </div>

          <div className="col-md-3">
            <label className="form-label">Rating</label>
            <select className="form-select" name="certification" value={form.certification} onChange={onChange}>
              {["U", "UA", "A", "S"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-md-9">
            <label className="form-label">Cast (comma separated)</label>
            <input className="form-control" name="cast" value={form.cast} onChange={onChange} />
          </div>

          <div className="col-12">
            <label className="form-label">Poster image URL (paste a link ending in .jpg or .png)</label>
            <input className="form-control" name="media" value={form.media} onChange={onChange} placeholder="https://..." />
            {poster && (
              <img
                src={poster}
                alt="preview"
                className="mt-2 rounded"
                style={{ height: 160 }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button className="btn btn-accent" disabled={saving}>
            {saving ? "Saving..." : editId ? "Save changes" : "Add movie"}
          </button>
          <button type="button" className="btn btn-outline-light" onClick={() => navigate("/admin")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
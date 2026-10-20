import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaHeart, FaRegHeart, FaStar } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { formatDate, getErrorMessage, getPoster } from "../../utils/helpers";
import "./style.scss";

const Stars = ({ value }) => (
  <span className="stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <FaStar key={n} className={n <= Math.round(value) ? "on" : "off"} />
    ))}
  </span>
);

export default function MovieDetails() {
  const { movieId } = useParams();
  const { resData, loading, error } = useFetch(`/api/movie/${movieId}`);
  const reviewsFetch = useFetch(`/api/review/movie/${movieId}?limit=20`);

  const [isFav, setIsFav] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/api/favorite/check/${movieId}`)
      .then(({ data }) => setIsFav(data.isFavorite))
      .catch(() => {});
  }, [movieId]);

  const reviews = reviewsFetch.resData;
  const mine = reviews?.mine;

  // fill the form with your existing review
  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment || "");
    }
  }, [mine]);

  const toggleFavorite = async () => {
    try {
      if (isFav) await api.delete(`/api/favorite/${movieId}`);
      else await api.post(`/api/favorite/${movieId}`);
      setIsFav(!isFav);
      toast.success(isFav ? "Removed from favorites" : "Added to favorites");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/review/${movieId}`, { rating: Number(rating), comment });
      toast.success("Review saved");
      reviewsFetch.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (id) => {
    try {
      await api.delete(`/api/review/${id}`);
      toast.success("Review deleted");
      setComment("");
      setRating(5);
      reviewsFetch.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="page-wrap text-danger">{error}</div>;

  const movie = resData.movie;

  return (
    <div className="page-wrap details-page">
      <div className="row g-4">
        <div className="col-md-4 col-lg-3">
          <img
            className="poster"
            src={getPoster(movie.media)}
            alt={movie.movieName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default-movie.svg";
            }}
          />
        </div>

        <div className="col-md-8 col-lg-9">
          <h1 className="mb-1">{movie.movieName}</h1>
          <div className="d-flex align-items-center gap-2 mb-3">
            <Stars value={reviews?.average || 0} />
            <span className="text-muted-2">
              {reviews?.count ? `${reviews.average} / 5 (${reviews.count} reviews)` : "No reviews yet"}
            </span>
          </div>

          <div className="mb-3">
            {movie.genres.map((g) => (
              <span key={g} className="chip me-2">
                {g}
              </span>
            ))}
          </div>

          <p>{movie.description}</p>

          <table className="table table-sm info-table">
            <tbody>
              <tr><th>Language</th><td>{movie.language || "-"}</td></tr>
              <tr><th>Rating</th><td>{movie.certification || "-"}</td></tr>
              <tr><th>Runtime</th><td>{movie.runtime ? `${movie.runtime} min` : "-"}</td></tr>
              <tr><th>Release date</th><td>{formatDate(movie.releaseDate)}</td></tr>
              <tr><th>Cast</th><td>{movie.cast?.length ? movie.cast.join(", ") : "-"}</td></tr>
            </tbody>
          </table>

          <div className="d-flex gap-2 flex-wrap">
            <Link to={`/shows/${encodeURIComponent(movie.movieName)}`} className="btn btn-accent btn-lg">
              View shows and book
            </Link>
            <button className="btn btn-outline-light btn-lg" onClick={toggleFavorite}>
              {isFav ? <FaHeart className="text-danger" /> : <FaRegHeart />} {isFav ? "Favorited" : "Add to favorites"}
            </button>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="row g-4">
        <div className="col-lg-5">
          <form className="card-dark" onSubmit={submitReview}>
            <h5>{mine ? "Update your review" : "Write a review"}</h5>
            <div className="mb-3">
              <label className="form-label">Rating</label>
              <select className="form-select" value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Comment</label>
              <textarea className="form-control" rows="3" maxLength="1000" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <button className="btn btn-accent" disabled={saving}>
              {saving ? "Saving..." : mine ? "Update review" : "Post review"}
            </button>
          </form>
        </div>

        <div className="col-lg-7">
          <h5>Reviews</h5>
          {reviewsFetch.loading ? (
            <Loader small />
          ) : !reviews?.reviews.length ? (
            <p className="text-muted-2">Be the first to review this movie.</p>
          ) : (
            reviews.reviews.map((r) => (
              <div key={r._id} className="card-dark mb-2 py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{r.user?.username || "Deleted user"}</strong>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="mb-1 mt-1">{r.comment}</p>}
                <small className="text-muted-2">{formatDate(r.createdAt)}</small>
                {mine && mine._id === r._id && (
                  <button className="btn btn-sm btn-outline-danger ms-3" onClick={() => deleteReview(r._id)}>
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
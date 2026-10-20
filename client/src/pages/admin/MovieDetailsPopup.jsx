import { formatDate, getPoster } from "../../utils/helpers";

// handles media as a string, an array, or { url } objects, with a fallback image
export default function MovieDetailsPopup({ movie, onClose }) {
  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="d-flex gap-3 flex-wrap flex-sm-nowrap">
          <img
            src={getPoster(movie.media)}
            alt={movie.movieName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default-movie.svg";
            }}
          />
          <div>
            <h4>{movie.movieName}</h4>
            <p className="text-muted-2">{movie.description}</p>
            <div className="mb-2">
              {movie.genres.map((g) => (
                <span key={g} className="chip me-1">{g}</span>
              ))}
            </div>
            <div>Language: {movie.language || "-"}</div>
            <div>Rating: {movie.certification || "-"}</div>
            <div>Runtime: {movie.runtime ? `${movie.runtime} min` : "-"}</div>
            <div>Release: {formatDate(movie.releaseDate)}</div>
            <div>Cast: {movie.cast?.length ? movie.cast.join(", ") : "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
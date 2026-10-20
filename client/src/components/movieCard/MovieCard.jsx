import { Link } from "react-router-dom";
import { BsCalendar3 } from "react-icons/bs";
import { formatCardDate, getPoster } from "../../utils/helpers";
import "./style.scss";

// action = optional extra buttons shown under the card
export default function MovieCard({ movie, action }) {
  const genres = (movie.genres || []).join(", ");

  return (
    <div className="movie-card">
      <Link to={`/movie/${movie.movieId}`}>
        <img
          src={getPoster(movie.media)}
          alt={movie.movieName}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/default-movie.svg";
          }}
        />
      </Link>

      <div className="info">
        <Link to={`/movie/${movie.movieId}`} className="name" title={movie.movieName}>
          {movie.movieName}
        </Link>
        <div className="date">
          <BsCalendar3 /> {formatCardDate(movie.releaseDate)}
        </div>
        <div className="genre-pill" title={genres}>
          {genres}
        </div>
        {action}
      </div>
    </div>
  );
}
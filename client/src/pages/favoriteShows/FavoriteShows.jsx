import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import MovieCard from "../../components/movieCard/MovieCard";
import Loader from "../../components/loader/Loader";
import { getErrorMessage } from "../../utils/helpers";

export default function FavoriteShows() {
  const { resData, loading, error, refetch } = useFetch("/api/favorite");

  const remove = async (movieId) => {
    try {
      await api.delete(`/api/favorite/${movieId}`);
      toast.success("Removed from favorites");
      refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="page-wrap wide">
      <h1 className="hero-title">
        My <span>Favorites</span>
      </h1>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : resData.movies.length === 0 ? (
        <p className="text-muted-2 text-center">
          No favorites yet. Open a movie and press "Add to favorites". <Link to="/home">Browse movies</Link>
        </p>
      ) : (
        <div className="movie-grid">
          {resData.movies.map((m) => (
            <MovieCard
              key={m.movieId}
              movie={m}
              action={
                <div className="d-flex gap-2 mt-auto pt-2">
                  <Link to={`/shows/${encodeURIComponent(m.movieName)}`} className="btn btn-accent btn-sm flex-grow-1">
                    Book
                  </Link>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => remove(m.movieId)}>
                    Remove
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import MovieCard from "../../components/movieCard/MovieCard";
import Pagination from "../../components/pagination/Pagination";
import Loader from "../../components/loader/Loader";

const FILTER_KEYS = ["search", "genre", "language", "certification", "theatre", "location", "date"];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(parseInt(params.get("page")) || 1, 1);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    FILTER_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) p.set(k, v);
    });
    p.set("page", page);
    p.set("limit", 12);
    return p.toString();
  }, [params, page]);

  const { resData, loading, error } = useFetch(`/api/movie?${query}`);
  const active = FILTER_KEYS.filter((k) => params.get(k));

  const goPage = (n) => {
    const p = new URLSearchParams(params);
    p.set("page", n);
    setParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-wrap wide">
      <h1 className="hero-title">
        Available <span>Movies</span>
      </h1>

      {active.length > 0 && (
        <div className="d-flex align-items-center gap-2 flex-wrap mb-3 justify-content-center">
          {active.map((k) => (
            <span className="chip" key={k}>
              {k}: {params.get(k)}
            </span>
          ))}
          <button className="btn btn-sm btn-outline-light" onClick={() => setParams({})}>
            Clear filters
          </button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-danger text-center">{error}</p>
      ) : resData.movies.length === 0 ? (
        <p className="text-muted-2 text-center">No movies found. Try different filters.</p>
      ) : (
        <>
          <div className="movie-grid">
            {resData.movies.map((m) => (
              <MovieCard key={m.movieId} movie={m} />
            ))}
          </div>
          <Pagination page={resData.page} pages={resData.pages} onChange={goPage} />
        </>
      )}
    </div>
  );
}
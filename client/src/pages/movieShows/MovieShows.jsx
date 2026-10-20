import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { formatDate, money, showStart, to12h } from "../../utils/helpers";
import "./style.scss";

export default function MovieShows() {
  const { movieName } = useParams();
  const { resData, loading, error } = useFetch(`/api/shows/getmovieshows/${encodeURIComponent(movieName)}`);

  // upcoming shows only, sorted by date and time, grouped by date
  const groups = useMemo(() => {
    if (!resData) return [];
    const now = new Date();
    const upcoming = resData.shows
      .filter((s) => showStart(s.showdate, s.showtime) > now)
      .sort((a, b) => showStart(a.showdate, a.showtime) - showStart(b.showdate, b.showtime));

    const map = {};
    upcoming.forEach((s) => {
      (map[s.showdate] = map[s.showdate] || []).push(s);
    });
    return Object.entries(map);
  }, [resData]);

  if (loading) return <Loader />;
  if (error) return <div className="page-wrap text-danger">{error}</div>;

  return (
    <div className="page-wrap shows-page">
      <Link to={`/movie/${resData.movie.movieId}`} className="text-muted-2">
        &larr; Back to movie
      </Link>
      <h2 className="page-title mt-2">{resData.movie.movieName}: shows</h2>

      {groups.length === 0 ? (
        <p className="text-muted-2">No upcoming shows for this movie yet.</p>
      ) : (
        groups.map(([date, shows]) => (
          <div key={date} className="mb-4">
            <h5 className="date-title">{formatDate(date)}</h5>
            <div className="row g-3">
              {shows.map((s) => (
                <div className="col-md-6 col-lg-4" key={s.showId}>
                  <div className="card-dark show-card">
                    <div className="time">{to12h(s.showtime)}</div>
                    <div className="theatre">{s.theatreName}</div>
                    <div className="text-muted-2 mb-2">{s.location}</div>
                    <div className="prices">
                      Balcony {money(s.prices.balcony)} · Middle {money(s.prices.middle)} · Lower {money(s.prices.lower)}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className={s.availableSeats > 0 ? "seats-left" : "text-danger"}>
                        {s.availableSeats > 0 ? `${s.availableSeats} seats left` : "Sold out"}
                      </span>
                      {s.availableSeats > 0 ? (
                        <Link to={`/seats/${s.showId}`} className="btn btn-accent btn-sm">
                          Select seats
                        </Link>
                      ) : (
                        <button className="btn btn-secondary btn-sm" disabled>
                          Sold out
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
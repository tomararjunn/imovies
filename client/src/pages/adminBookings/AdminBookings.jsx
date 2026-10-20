import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import Pagination from "../../components/pagination/Pagination";
import { formatDate, getErrorMessage, money, to12h } from "../../utils/helpers";

const STATUSES = ["", "confirmed", "pending", "cancelled", "failed", "expired"];
const BADGE = { confirmed: "success", pending: "warning", cancelled: "secondary", failed: "danger", expired: "dark" };

export default function AdminBookings() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const url = `/api/bookings?page=${page}&limit=10${status ? `&status=${status}` : ""}${query ? `&search=${encodeURIComponent(query)}` : ""}`;
  const { resData, loading, error, refetch } = useFetch(url);

  const cancel = async (b) => {
    if (!window.confirm("Cancel this booking and refund the customer?")) return;
    try {
      await api.put(`/api/bookings/${b.bookingId}/cancel`);
      toast.success("Booking cancelled");
      refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="page-wrap wide">
      <h2 className="page-title">Bookings</h2>

      <div className="card-dark mb-3">
        <div className="row g-2">
          <div className="col-md-4">
            <input className="form-control" placeholder="Search by user email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s ? s : "All statuses"}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-dark">
        {loading ? (
          <Loader />
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : resData.bookings.length === 0 ? (
          <p className="text-muted-2">No bookings found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th><th>User</th><th>Movie</th><th>Show</th><th>Seats</th><th>Amount</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {resData.bookings.map((b) => (
                  <tr key={b.bookingId}>
                    <td title={b.bookingId}><code>{b.bookingId.slice(0, 8)}</code></td>
                    <td>{b.userEmail}</td>
                    <td>{b.movie?.movieName || "-"}</td>
                    <td className="text-nowrap">
                      {b.show ? (
                        <>
                          {b.show.theatreName}
                          <br />
                          <small className="text-muted-2">{formatDate(b.show.showdate)} · {to12h(b.show.showtime)}</small>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{b.ticketsData.seats.map((s) => s.seatId).join(", ")}</td>
                    <td>{money(b.amount)}</td>
                    <td><span className={`badge bg-${BADGE[b.status]}`}>{b.status}</span></td>
                    <td className="text-end">
                      {b.status === "confirmed" && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {resData && <Pagination page={resData.page} pages={resData.pages} onChange={setPage} />}
      </div>
    </div>
  );
}
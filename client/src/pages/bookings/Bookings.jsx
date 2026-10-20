import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import Pagination from "../../components/pagination/Pagination";
import { formatDate, getErrorMessage, getPoster, money, to12h } from "../../utils/helpers";
import "./style.scss";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// opens a clean window with just the ticket and prints it
const printTicket = (b) => {
  const seats = b.ticketsData.seats.map((s) => s.seatId).join(", ");
  const w = window.open("", "_blank", "width=520,height=640");
  if (!w) return toast.error("Please allow pop-ups to print the ticket");
  w.document.write(`<html><head><title>E-ticket</title></head>
    <body style="font-family:Arial;padding:24px">
      <div style="border:2px dashed #333;border-radius:12px;padding:20px;max-width:420px">
        <h2 style="margin:0 0 4px">IMovies e-ticket</h2>
        <h3 style="margin:0 0 12px;color:#d6336c">${esc(b.movie?.movieName)}</h3>
        <p><b>Theatre:</b> ${esc(b.show?.theatreName)}, ${esc(b.show?.location)}</p>
        <p><b>Date:</b> ${esc(b.show?.showdate)} &nbsp; <b>Time:</b> ${esc(to12h(b.show?.showtime))}</p>
        <p><b>Seats:</b> ${esc(seats)}</p>
        <p><b>Amount paid:</b> Rs. ${esc(b.amount)}</p>
        <p style="font-size:12px;color:#555"><b>Booking ID:</b> ${esc(b.bookingId)}</p>
      </div></body></html>`);
  w.document.close();
  w.focus();
  w.print();
};

export default function Bookings() {
  const [tab, setTab] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // booking whose ticket is expanded
  const { resData, loading, error, refetch } = useFetch(`/api/bookings/my?type=${tab}&page=${page}&limit=5`);

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
    setOpen(null);
  };

  const cancel = async (b) => {
    if (!window.confirm("Cancel this booking? The amount will be refunded.")) return;
    try {
      await api.put(`/api/bookings/${b.bookingId}/cancel`);
      toast.success("Booking cancelled");
      refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="page-wrap bookings-page">
      <h2 className="page-title">My bookings</h2>

      <div className="btn-group mb-4">
        <button className={`btn ${tab === "upcoming" ? "btn-accent" : "btn-outline-light"}`} onClick={() => switchTab("upcoming")}>
          Upcoming
        </button>
        <button className={`btn ${tab === "past" ? "btn-accent" : "btn-outline-light"}`} onClick={() => switchTab("past")}>
          Past and cancelled
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : resData.bookings.length === 0 ? (
        <p className="text-muted-2">
          Nothing here yet. <Link to="/home">Browse movies</Link>
        </p>
      ) : (
        <>
          {resData.bookings.map((b) => {
            const seats = b.ticketsData.seats.map((s) => s.seatId);
            return (
              <div key={b.bookingId} className="card-dark booking-card mb-3">
                <div className="d-flex gap-3">
                  <img src={getPoster(b.movie?.media)} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/default-movie.svg"; }} />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between flex-wrap gap-2">
                      <h5 className="mb-0">{b.movie?.movieName || "Movie removed"}</h5>
                      <span className={`badge status-${b.status}`}>{b.status}</span>
                    </div>
                    {b.show && (
                      <div className="text-muted-2">
                        {b.show.theatreName}, {b.show.location} · {formatDate(b.show.showdate)} · {to12h(b.show.showtime)}
                      </div>
                    )}
                    <div className="mt-1">
                      Seats: <strong>{seats.join(", ")}</strong> · Paid: <strong>{money(b.amount)}</strong>
                    </div>
                    {b.status === "cancelled" && b.refundStatus && (
                      <small className="text-muted-2">Refund: {b.refundStatus}</small>
                    )}

                    <div className="d-flex gap-2 mt-2 flex-wrap">
                      {b.status === "confirmed" && (
                        <button className="btn btn-sm btn-outline-light" onClick={() => setOpen(open === b.bookingId ? null : b.bookingId)}>
                          {open === b.bookingId ? "Hide ticket" : "View e-ticket"}
                        </button>
                      )}
                      {tab === "upcoming" && b.status === "confirmed" && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b)}>
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {open === b.bookingId && (
                  <div className="ticket mt-3">
                    <div>
                      <div className="t-label">Booking ID</div>
                      <div className="t-id">{b.bookingId}</div>
                    </div>
                    <div>
                      <div className="t-label">Seats</div>
                      <div>{seats.join(", ")}</div>
                    </div>
                    <button className="btn btn-sm btn-accent" onClick={() => printTicket(b)}>
                      Print ticket
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <Pagination page={resData.page} pages={resData.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
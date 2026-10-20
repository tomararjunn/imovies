import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { formatDate, getErrorMessage, money, to12h } from "../../utils/helpers";
import "./style.scss";

const CLASS_ORDER = ["lower", "middle", "balcony"]; // front of the hall first
const MAX_SEATS = 8;

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function SeatsPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resData, loading, error, refetch } = useFetch(`/api/shows/${showId}`);

  const [selected, setSelected] = useState([]);
  const [checkout, setCheckout] = useState(null); // set after seats are held and an order exists
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("Card");
  const [now, setNow] = useState(Date.now());

  const checkoutRef = useRef(null);
  const paidRef = useRef(false);
  checkoutRef.current = checkout;

  // refresh seats every 5 seconds so you see other people's bookings
  useEffect(() => {
    const t = setInterval(() => refetch(true), 5000);
    return () => clearInterval(t);
  }, [refetch]);

  // countdown clock while paying
  useEffect(() => {
    if (!checkout) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [checkout]);

  // leaving the page while paying -> free the seats
  useEffect(
    () => () => {
      const c = checkoutRef.current;
      if (c && !paidRef.current) {
        api.post("/api/bookings/fail", { bookingId: c.booking.bookingId }).catch(() => {});
      }
    },
    []
  );

  const tickets = resData?.show?.tickets;
  const movie = resData?.movie;
  const show = resData?.show;
  const theatre = resData?.theatre;

  // group seats: class -> row -> seats
  const layout = useMemo(() => {
    const classes = {};
    Object.entries(tickets || {}).forEach(([id, t]) => {
      const m = id.match(/^([A-Z]+)(\d+)$/);
      if (!m) return;
      if (!classes[t.class]) classes[t.class] = {};
      if (!classes[t.class][m[1]]) classes[t.class][m[1]] = [];
      classes[t.class][m[1]].push({ id, num: Number(m[2]), ...t });
    });
    Object.values(classes).forEach((rows) => Object.values(rows).forEach((arr) => arr.sort((a, b) => a.num - b.num)));
    return classes;
  }, [tickets]);

  const seatState = (seat) => {
    if (selected.includes(seat.id)) return "selected";
    if (seat.status === "booked") return "booked";
    if (seat.status === "locked") return seat.mine ? "mine" : "locked";
    return "available";
  };

  const toggleSeat = (seat) => {
    if (checkout) return;
    const state = seatState(seat);
    if (state === "booked" || state === "locked") return;
    if (state === "selected") return setSelected(selected.filter((s) => s !== seat.id));
    if (selected.length >= MAX_SEATS) return toast.warn(`You can select up to ${MAX_SEATS} seats`);
    setSelected([...selected, seat.id]);
  };

  const total = selected.reduce((sum, id) => sum + (tickets?.[id]?.price || 0), 0);

  // ----- payment steps -----
  const confirmPayment = async (payload) => {
    const c = checkoutRef.current;
    if (!c) return;
    paidRef.current = true;
    setBusy(true);
    try {
      await api.post("/api/bookings/confirm", { bookingId: c.booking.bookingId, ...payload });
      checkoutRef.current = null;
      setCheckout(null);
      toast.success("Booking confirmed! Your e-ticket is in My Bookings");
      navigate("/bookings");
    } catch (err) {
      paidRef.current = false;
      toast.error(getErrorMessage(err));
      setCheckout(null);
      setSelected([]);
      refetch(true);
    } finally {
      setBusy(false);
    }
  };

  const cancelPayment = async (message = "Payment cancelled") => {
    const c = checkoutRef.current;
    if (!c || paidRef.current) return;
    checkoutRef.current = null;
    setCheckout(null);
    try {
      await api.post("/api/bookings/fail", { bookingId: c.booking.bookingId });
    } catch {
      /* the hold expires by itself anyway */
    }
    setSelected([]);
    toast.info(message);
    refetch(true);
  };

  const openRazorpay = async (data) => {
    const ok = await loadRazorpay();
    if (!ok) return toast.error("Could not load Razorpay. Check your internet connection");

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.order.amount,
      currency: data.order.currency,
      name: "IMovies",
      description: `${movie?.movieName} - ${data.booking.seats.map((s) => s.seatId).join(", ")}`,
      order_id: data.order.id,
      prefill: { email: user.email },
      theme: { color: "#ff4d6d" },
      handler: (resp) => confirmPayment(resp),
      modal: { ondismiss: () => cancelPayment("Payment cancelled") },
    });
    rzp.on("payment.failed", () => toast.error("Payment failed. You can try another method"));
    rzp.open();
  };

  const proceed = async () => {
    if (!selected.length) return toast.warn("Select at least one seat");
    setBusy(true);
    try {
      await api.post("/api/bookings/lock", { showId, seats: selected });
      const { data } = await api.post("/api/bookings/checkout", { showId, seats: selected });
      paidRef.current = false;
      setCheckout(data);
      setNow(Date.now());
      refetch(true);
      if (!data.mock) openRazorpay(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      api.post("/api/bookings/release", { showId }).catch(() => {});
      setSelected([]);
      refetch(true);
    } finally {
      setBusy(false);
    }
  };

  const mockPay = () =>
    confirmPayment({
      razorpay_order_id: checkout.order.id,
      razorpay_payment_id: `mock_pay_${Date.now()}`,
      razorpay_signature: "mock",
    });

  // seat hold ran out
  const remaining = checkout ? Math.max(0, checkout.expiresAt - now) : 0;
  useEffect(() => {
    if (checkout && remaining === 0) cancelPayment("Time ran out, your seats were released");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, remaining]);

  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  if (loading) return <Loader />;
  if (error) return <div className="page-wrap text-danger">{error}</div>;

  return (
    <div className="page-wrap seats-page">
      <h2 className="mb-1">{movie?.movieName}</h2>
      <p className="text-muted-2">
        {show.theatreName}
        {theatre?.location ? `, ${theatre.location}` : ""} · {formatDate(show.showdate)} · {to12h(show.showtime)}
      </p>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card-dark">
            <div className="screen">SCREEN THIS WAY</div>

            {CLASS_ORDER.filter((c) => layout[c]).map((cls) => {
              const rows = layout[cls];
              const price = Object.values(rows)[0][0].price;
              return (
                <div key={cls} className="class-block">
                  <div className="class-title">
                    {cls.toUpperCase()} · {money(price)}
                  </div>
                  {Object.entries(rows).map(([row, seats]) => (
                    <div key={row} className="seat-row">
                      <span className="row-label">{row}</span>
                      {seats.map((seat) => {
                        const state = seatState(seat);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={`seat ${state}`}
                            disabled={state === "booked" || state === "locked" || !!checkout}
                            onClick={() => toggleSeat(seat)}
                            title={`${seat.id} - ${money(seat.price)}`}
                          >
                            {seat.num}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="legend">
              <span><i className="seat available" /> Available</span>
              <span><i className="seat selected" /> Selected</span>
              <span><i className="seat locked" /> Held by someone</span>
              <span><i className="seat booked" /> Booked</span>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-dark summary">
            <h5>Booking summary</h5>

            {selected.length === 0 ? (
              <p className="text-muted-2">Click seats to select them (max {MAX_SEATS}).</p>
            ) : (
              <>
                <table className="table table-sm">
                  <tbody>
                    {selected.map((id) => (
                      <tr key={id}>
                        <td>
                          {id} <small className="text-muted-2">({tickets[id].class})</small>
                        </td>
                        <td className="text-end">{money(tickets[id].price)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td><strong>Total</strong></td>
                      <td className="text-end"><strong>{money(total)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {!checkout ? (
              <button className="btn btn-accent w-100" disabled={busy || selected.length === 0} onClick={proceed}>
                {busy ? "Please wait..." : "Proceed to payment"}
              </button>
            ) : (
              <div className="pay-panel">
                <div className="timer">
                  Seats held for <strong>{mm}:{ss}</strong>
                </div>

                {checkout.mock ? (
                  <>
                    <div className="alert alert-warning py-2 small">
                      Test mode: no real money is charged (Razorpay keys are not set).
                    </div>
                    <label className="form-label">Payment method</label>
                    <select className="form-select mb-3" value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option>Card</option>
                      <option>UPI</option>
                      <option>Net banking</option>
                    </select>
                    <button className="btn btn-accent w-100 mb-2" disabled={busy} onClick={mockPay}>
                      {busy ? "Processing..." : `Pay ${money(checkout.booking.amount)} with ${method}`}
                    </button>
                    <button className="btn btn-outline-danger w-100 mb-2" disabled={busy} onClick={() => cancelPayment("Payment failed. Seats released")}>
                      Simulate failed payment
                    </button>
                  </>
                ) : (
                  <button className="btn btn-accent w-100 mb-2" disabled={busy} onClick={() => openRazorpay(checkout)}>
                    Pay {money(checkout.booking.amount)} with Razorpay
                  </button>
                )}

                <button className="btn btn-link text-muted-2 w-100" disabled={busy} onClick={() => cancelPayment("Booking cancelled")}>
                  Cancel and release seats
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
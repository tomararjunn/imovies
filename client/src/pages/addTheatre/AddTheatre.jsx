import { useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import useFetch from "../../hooks/useFetch";
import Loader from "../../components/loader/Loader";
import { getErrorMessage, money } from "../../utils/helpers";

const BLOCKS = [
  ["balcony", "Balcony"],
  ["middle", "Middle"],
  ["lower", "Lower"],
];

const INITIAL = {
  theatreName: "",
  location: "",
  balconyPrice: 300,
  middlePrice: 200,
  lowerPrice: 120,
  balconyRows: "A,B",
  middleRows: "C,D",
  lowerRows: "E,F",
  balconyCols: 8,
  middleCols: 10,
  lowerCols: 10,
};

const parseRows = (s) =>
  s.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);

export default function AddTheatre() {
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const theatres = useFetch("/api/theatre");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.theatreName.trim() || !form.location.trim()) return toast.error("Theatre name and location are required");

    const body = { theatreName: form.theatreName.trim(), location: form.location.trim() };
    const allRows = [];

    for (const [key, label] of BLOCKS) {
      const rows = parseRows(form[`${key}Rows`]);
      const cols = Number(form[`${key}Cols`]);
      const price = Number(form[`${key}Price`]);

      if (!rows.length || !rows.every((r) => /^[A-Z]{1,2}$/.test(r))) {
        return toast.error(`${label}: rows must be 1-2 letters like A,B`);
      }
      if (!Number.isInteger(cols) || cols < 1 || cols > 30) return toast.error(`${label}: seats per row must be 1-30`);
      if (Number.isNaN(price) || price < 0) return toast.error(`${label}: enter a valid price`);

      allRows.push(...rows);
      body[`${key}SeatPrice`] = price;
      body[`${key}Seats`] = { rows, cols };
    }

    if (new Set(allRows).size !== allRows.length) return toast.error("Row letters must be different in every section");

    setSaving(true);
    try {
      await api.post("/api/theatre", body);
      toast.success("Theatre added");
      setForm(INITIAL);
      theatres.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.theatreName}?`)) return;
    try {
      await api.delete(`/api/theatre/${t.theatreId}`);
      toast.success("Theatre deleted");
      theatres.refetch(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const seatCount = (t) =>
    ["balconySeats", "middleSeats", "lowerSeats"].reduce((sum, k) => sum + t[k].rows.length * t[k].cols, 0);

  return (
    <div className="page-wrap" style={{ maxWidth: 900 }}>
      <h2 className="page-title">Add theatre</h2>

      <form className="card-dark mb-4" onSubmit={onSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Theatre name</label>
            <input className="form-control" name="theatreName" value={form.theatreName} onChange={onChange} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Location (city)</label>
            <input className="form-control" name="location" value={form.location} onChange={onChange} />
          </div>

          {BLOCKS.map(([key, label]) => (
            <div className="col-12" key={key}>
              <div className="row g-2 align-items-end">
                <div className="col-12">
                  <strong>{label} seats</strong>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Row letters</label>
                  <input className="form-control" name={`${key}Rows`} value={form[`${key}Rows`]} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Seats per row</label>
                  <input className="form-control" type="number" name={`${key}Cols`} value={form[`${key}Cols`]} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Price per seat (₹)</label>
                  <input className="form-control" type="number" name={`${key}Price`} value={form[`${key}Price`]} onChange={onChange} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-accent mt-4" disabled={saving}>
          {saving ? "Saving..." : "Add theatre"}
        </button>
      </form>

      <div className="card-dark">
        <h5>Your theatres</h5>
        {theatres.loading ? (
          <Loader small />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Location</th><th>Seats</th><th>Prices</th><th></th></tr>
              </thead>
              <tbody>
                {theatres.resData?.theatres.map((t) => (
                  <tr key={t.theatreId}>
                    <td>{t.theatreName}</td>
                    <td>{t.location}</td>
                    <td>{seatCount(t)}</td>
                    <td className="text-nowrap">
                      {money(t.balconySeatPrice)} / {money(t.middleSeatPrice)} / {money(t.lowerSeatPrice)}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
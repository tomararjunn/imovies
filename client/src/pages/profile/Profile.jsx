import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import useFetch from "../../hooks/useFetch";
import "./style.scss";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const bookings = useFetch("/api/bookings/my?type=upcoming&limit=1").resData;
  const favorites = useFetch("/api/favorite").resData;

  const handleLogout = () => {
    logout();
    toast.info("Logged out");
    navigate("/");
  };

  return (
    <div className="page-wrap profile-page">
      <h2 className="page-title">My profile</h2>

      <div className="card-dark mb-4">
        <div className="avatar">{user.username[0].toUpperCase()}</div>
        <h4 className="mb-0">{user.username}</h4>
        <p className="text-muted-2">{user.email}</p>

        <div className="d-flex gap-2 flex-wrap">
          <Link to="/profile/edit" className="btn btn-accent">
            Edit details
          </Link>
          <button className="btn btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-6">
          <Link to="/bookings" className="card-dark d-block text-center stat">
            <div className="num">{bookings ? bookings.total : "-"}</div>
            <div className="text-muted-2">Upcoming shows</div>
          </Link>
        </div>
        <div className="col-6">
          <Link to="/favorites" className="card-dark d-block text-center stat">
            <div className="num">{favorites ? favorites.total : "-"}</div>
            <div className="text-muted-2">Favorites</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
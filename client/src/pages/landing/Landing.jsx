import { Link } from "react-router-dom";
import { MdEventSeat, MdPayment, MdFavorite } from "react-icons/md";
import { useAuth } from "../../context/AuthContext";
import "./style.scss";

export default function Landing() {
  const { user } = useAuth();
  const homePath = user?.role === "admin" ? "/admin" : "/home";

  return (
    <div className="landing">
      <section className="hero">
        <div className="container text-center">
          <h1>
            Movie ticket booking <span>made simple</span>
          </h1>
          <p className="lead">Pick a movie, choose your seats, pay securely and get your e-ticket in seconds.</p>

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            {user ? (
              <Link to={homePath} className="btn btn-accent btn-lg">
                {user.role === "admin" ? "Open dashboard" : "Browse movies"}
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-accent btn-lg">
                  Get started
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container features">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card-dark h-100 text-center">
              <MdEventSeat size={42} />
              <h5 className="mt-2">Live seat selection</h5>
              <p className="text-muted-2 mb-0">See which seats are free and pick the best ones.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card-dark h-100 text-center">
              <MdPayment size={42} />
              <h5 className="mt-2">Secure payment</h5>
              <p className="text-muted-2 mb-0">Pay online and get an instant booking confirmation.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card-dark h-100 text-center">
              <MdFavorite size={42} />
              <h5 className="mt-2">Favorites and reviews</h5>
              <p className="text-muted-2 mb-0">Save movies for later and share what you think.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiHeart, FiHome, FiMoon, FiSun } from "react-icons/fi";
import { FaRegUserCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import useFetch from "../../hooks/useFetch";
import "./style.scss";

const ADMIN_LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/add-movie", "Add Movie"],
  ["/admin/add-theatre", "Add Theatre"],
  ["/admin/add-show", "Add Show"],
  ["/admin/bookings", "Bookings"],
];

const FILTERS = [
  ["genre", "Genre", "genres"],
  ["language", "Language", "languages"],
  ["certification", "Rating", "certifications"],
  ["theatre", "Theatre", "theatres"],
  ["location", "Location", "locations"],
];

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const isUser = user?.role === "user";
  const isAdmin = user?.role === "admin";
  const onHome = location.pathname === "/home";

  const [text, setText] = useState(params.get("search") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  const options = useFetch(isUser ? "/api/movie/filters/options" : null).resData;

  // the URL holds the search and filters, the Home page reads them
  const updateParams = (changes) => {
    const p = new URLSearchParams(onHome ? params : "");
    Object.entries(changes).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    p.delete("page");
    navigate(`/home?${p.toString()}`, { replace: onHome });
  };

  const urlSearch = params.get("search") || "";
  const value = (key) => (onHome ? params.get(key) || "" : "");

  // keep the box in sync when filters are cleared
  useEffect(() => {
    if (onHome) setText(urlSearch);
  }, [urlSearch, onHome]);

  // search 400ms after you stop typing
  useEffect(() => {
    if (!isUser || text === urlSearch) return;
    if (!onHome && !text) return;
    const t = setTimeout(() => updateParams({ search: text }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // click outside closes the panels
  useEffect(() => {
    const close = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setFiltersOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.info("Logged out");
    navigate("/");
  };

  const logoTo = isAdmin ? "/admin" : user ? "/home" : "/";

  return (
    <header className="app-header">
      <div className="bar">
        <Link to={logoTo} className="logo">
          <span>i</span>Movies
        </Link>

        {isUser && (
          <div className="search-wrap" ref={searchRef}>
            <input
              className="search"
              placeholder="Search movies..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="button" className="info-btn" title="Filters" onClick={() => setFiltersOpen(!filtersOpen)}>
              i
            </button>

            {filtersOpen && (
              <div className="filter-panel">
                <div className="fp-title">Filter movies</div>
                {FILTERS.map(([key, label, listKey]) => (
                  <select
                    key={key}
                    className="form-select form-select-sm"
                    value={value(key)}
                    onChange={(e) => updateParams({ [key]: e.target.value })}
                  >
                    <option value="">{label}: all</option>
                    {(options?.[listKey] || []).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ))}
                <input
                  className="form-control form-control-sm"
                  type="date"
                  value={value("date")}
                  onChange={(e) => updateParams({ date: e.target.value })}
                />
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={() => {
                    setText("");
                    setFiltersOpen(false);
                    navigate("/home");
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <nav className="admin-links">
            {ADMIN_LINKS.map(([to, label]) => (
              <NavLink end key={to} to={to}>
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="actions">
          <button className="icon-btn" onClick={toggleTheme} title="Switch theme">
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>

          {isUser && (
            <>
              <Link className="icon-btn" to="/home" title="Movies">
                <FiHome />
              </Link>
              <Link className="icon-btn" to="/favorites" title="Favorites">
                <FiHeart />
              </Link>
              <div className="menu-wrap" ref={menuRef}>
                <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} title="Account">
                  <FaRegUserCircle />
                </button>
                {menuOpen && (
                  <div className="menu">
                    <div className="who">
                      <strong>{user.username}</strong>
                      <small>{user.email}</small>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <Link to="/bookings" onClick={() => setMenuOpen(false)}>My bookings</Link>
                    <button onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            </>
          )}

          {isAdmin && (
            <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>
              Logout
            </button>
          )}

          {!user && (
            <>
              <Link to="/admin/login" className="small-link">Admin</Link>
              <Link className="btn btn-sm btn-outline-light" to="/login">Login</Link>
              <Link className="btn btn-sm btn-accent" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
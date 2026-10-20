import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Layout from "./components/layout/Layout";
import Loader from "./components/loader/Loader";
import UserProtection from "./components/protection/UserProtection";
import AdminProtection from "./components/protection/AdminProtection";

const Landing = lazy(() => import("./pages/landing/Landing"));
const Login = lazy(() => import("./pages/login/Login"));
const AdminLogin = lazy(() => import("./pages/login/AdminLogin"));
const Register = lazy(() => import("./pages/register/Register"));
const AdminRegister = lazy(() => import("./pages/register/AdminRegister"));

const Home = lazy(() => import("./pages/home/Home"));
const MovieDetails = lazy(() => import("./pages/movieDetails/MovieDetails"));
const MovieShows = lazy(() => import("./pages/movieShows/MovieShows"));
const SeatsPage = lazy(() => import("./pages/seatsPage/SeatsPage"));
const Bookings = lazy(() => import("./pages/bookings/Bookings"));
const FavoriteShows = lazy(() => import("./pages/favoriteShows/FavoriteShows"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const EditUserDetails = lazy(() => import("./pages/editUserDetails/EditUserDetails"));

const Admin = lazy(() => import("./pages/admin/Admin"));
const AddMovie = lazy(() => import("./pages/addMovie/AddMovie"));
const AddTheatre = lazy(() => import("./pages/addTheatre/AddTheatre"));
const AddShow = lazy(() => import("./pages/addShow/AddShow"));
const AdminBookings = lazy(() => import("./pages/adminBookings/AdminBookings"));

function NotFound() {
  return (
    <div className="page-wrap text-center">
      <h2 className="page-title">Page not found</h2>
      <Link to="/">Go to the home page</Link>
    </div>
  );
}

const user = (el) => <UserProtection>{el}</UserProtection>;
const admin = (el) => <AdminProtection>{el}</AdminProtection>;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />

            {/* user pages */}
            <Route path="/home" element={user(<Home />)} />
            <Route path="/movie/:movieId" element={user(<MovieDetails />)} />
            <Route path="/shows/:movieName" element={user(<MovieShows />)} />
            <Route path="/seats/:showId" element={user(<SeatsPage />)} />
            <Route path="/bookings" element={user(<Bookings />)} />
            <Route path="/favorites" element={user(<FavoriteShows />)} />
            <Route path="/profile" element={user(<Profile />)} />
            <Route path="/profile/edit" element={user(<EditUserDetails />)} />

            {/* admin pages */}
            <Route path="/admin" element={admin(<Admin />)} />
            <Route path="/admin/add-movie" element={admin(<AddMovie />)} />
            <Route path="/admin/add-theatre" element={admin(<AddTheatre />)} />
            <Route path="/admin/add-show" element={admin(<AddShow />)} />
            <Route path="/admin/bookings" element={admin(<AdminBookings />)} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </BrowserRouter>
  );
}
import "./style.scss";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container text-center">
        <div>
          <strong>iMovies</strong> · Movie ticket booking made simple · © {new Date().getFullYear()}
        </div>
        <small>Movie data and posters from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</small>
      </div>
    </footer>
  );
}
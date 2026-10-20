export default function Loader({ small = false }) {
  return (
    <div className={`d-flex justify-content-center align-items-center ${small ? "py-3" : "py-5"}`}>
      <div className="spinner-border text-danger" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}
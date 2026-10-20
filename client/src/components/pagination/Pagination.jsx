export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
      <button className="btn btn-sm btn-outline-light" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="text-muted-2">
        Page {page} of {pages}
      </span>
      <button className="btn btn-sm btn-outline-light" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
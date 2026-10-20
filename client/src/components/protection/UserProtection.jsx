import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only logged-in normal users can see the pages inside
export default function UserProtection({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== "user") return <Navigate to="/admin" replace />;
  return children;
}
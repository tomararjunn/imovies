import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only logged-in admins can see the pages inside
export default function AdminProtection({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/home" replace />;
  return children;
}
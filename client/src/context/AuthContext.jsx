import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

// reads the token cookie and decodes who is logged in
const readToken = () => {
  const token = Cookies.get("token");
  if (!token) return { token: null, user: null };
  try {
    const d = jwtDecode(token);
    if (d.exp && d.exp * 1000 < Date.now()) {
      Cookies.remove("token");
      return { token: null, user: null };
    }
    return { token, user: { id: d.id, username: d.username, email: d.email, role: d.role } };
  } catch {
    Cookies.remove("token");
    return { token: null, user: null };
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readToken);

  const login = useCallback((token) => {
    Cookies.set("token", token, { expires: 7, sameSite: "strict" });
    const next = readToken();
    setAuth(next);
    return next.user;
  }, []);

  const logout = useCallback(() => {
    Cookies.remove("token");
    setAuth({ token: null, user: null });
  }, []);

  const value = useMemo(() => ({ user: auth.user, token: auth.token, login, logout }), [auth, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("smart-library-token")) return setLoading(false);
    api.get("/auth/profile").then(({ data }) => setUser(data)).catch(() => localStorage.removeItem("smart-library-token")).finally(() => setLoading(false));
  }, []);

  const authenticate = async (path, payload) => {
    const { data } = await api.post(path, payload);
    localStorage.setItem("smart-library-token", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem("smart-library-token");
    setUser(null);
  };
  const refresh = async () => {
    const { data } = await api.get("/auth/profile");
    setUser(data);
  };
  const value = useMemo(() => ({
    user, loading, login: (p) => authenticate("/auth/login", p), register: (p) => authenticate("/auth/register", p), logout, refresh,
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

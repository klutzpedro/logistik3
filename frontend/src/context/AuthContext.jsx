import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("koarmada_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("koarmada_token", data.access_token);
    localStorage.setItem("koarmada_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("koarmada_token", data.access_token);
    localStorage.setItem("koarmada_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("koarmada_token");
    localStorage.removeItem("koarmada_user");
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("koarmada_token");
    if (token && !user) {
      setLoading(true);
      api.get("/auth/me").then(({ data }) => {
        setUser(data);
        localStorage.setItem("koarmada_user", JSON.stringify(data));
      }).catch(() => logout()).finally(() => setLoading(false));
    }
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

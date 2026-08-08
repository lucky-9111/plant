import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    api
      .get("/auth/me")
      .then((data) => setSession(data))
      .catch(() => setSession(null));
  }, []);

  async function login(identifier, password) {
    const data = await api.post("/auth/login", { identifier, password });
    setSession(data);
    return data;
  }

  async function register(payload) {
    const customer = await api.post("/customer/register", payload);
    const data = { type: "customer", id: customer.id, name: customer.name, email: customer.email };
    setSession(data);
    return data;
  }

  async function logout() {
    await api.post("/auth/logout");
    setSession(null);
  }

  const isAdminType = Boolean(session) && (session.type === "admin" || session.type === "developer");
  const username = session === undefined ? undefined : isAdminType ? session.username : null;
  const role = isAdminType ? session.type : null;

  return (
    <AuthContext.Provider value={{ session, username, role, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

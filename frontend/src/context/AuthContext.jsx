import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    api
      .get("/admin/me")
      .then((data) => setUsername(data.username))
      .catch(() => setUsername(null));
  }, []);

  async function login(user, pass) {
    const data = await api.post("/admin/login", { username: user, password: pass });
    setUsername(data.username);
  }

  async function logout() {
    await api.post("/admin/logout");
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ username, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Provides a React context for authentication state persisted in localStorage with login and logout helpers. Exports useAuth hook and ROLES constants for role checks throughout the app.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

function readStorage() {
  try {
    const token = localStorage.getItem("routed_token");
    const user  = JSON.parse(localStorage.getItem("routed_user") || "null");
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStorage);

  const login = useCallback((token, user) => {
    localStorage.setItem("routed_token", token);
    localStorage.setItem("routed_user",  JSON.stringify(user));
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("routed_token");
    localStorage.removeItem("routed_user");
    setAuth({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLES = {
  ADMIN:  "administrator",
  VENDOR: "vendor",
  DRIVER: "driver",
};

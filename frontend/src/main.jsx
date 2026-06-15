/**
 * Bootstraps the frontend React app with BrowserRouter, AuthProvider, and optional GoogleOAuthProvider. Mounts the root App component into the DOM with StrictMode enabled.
 * @name Shivum Arora
 * @date 2026-06-06
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import "./index.css";
import App from "./App.jsx";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const tree = (
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

createRoot(document.getElementById("root")).render(
  googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
    : tree
);

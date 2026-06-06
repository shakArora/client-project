/**
 * Centralised Axios client. Every page imports from here — never create
 * raw fetch/axios calls elsewhere.
 */
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: BASE,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("routed_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("routed_token");
      localStorage.removeItem("routed_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

/* ── Auth ─────────────────────────────────────────────── */
export const authApi = {
  login:           (email, password) => api.post("/auth/login",    { email, password }),
  register:        (data)            => api.post("/auth/register",  data),
  googleAdmin:     (idToken)         => api.post("/auth/google/admin", { idToken }),
  resetRequest:    (email, channel)  => api.post("/auth/password-reset/request",  { email, channel }),
  resetConfirm:    (token, newPassword) => api.post("/auth/password-reset/confirm", { token, newPassword }),
};

/* ── Fundraisers ──────────────────────────────────────── */
export const fundraiserApi = {
  list:     ()    => api.get("/fundraisers"),
  active:   ()    => api.get("/fundraisers/active"),
  get:      (id)  => api.get(`/fundraisers/${id}`),
  stats:    (id)  => api.get(`/fundraisers/${id}/stats`),
  create:   (data)=> api.post("/fundraisers", data),
  update:   (id, data) => api.patch(`/fundraisers/${id}`, data),
  activate: (id)  => api.patch(`/fundraisers/${id}/activate`),
};

/* ── Products ─────────────────────────────────────────── */
export const productApi = {
  list:   (fundraiserId) => api.get("/products", { params: { fundraiserId } }),
  get:    (id)           => api.get(`/products/${id}`),
  create: (data)         => api.post("/products", data),
  update: (id, data)     => api.patch(`/products/${id}`, data),
  delete: (id)           => api.delete(`/products/${id}`),
};

/* ── Orders ───────────────────────────────────────────── */
export const orderApi = {
  list:         (params)  => api.get("/orders", { params }),
  get:          (id)      => api.get(`/orders/${id}`),
  place:        (data)    => api.post("/orders", data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

/* ── Vendors ──────────────────────────────────────────── */
export const vendorApi = {
  list:      (params)      => api.get("/vendors", { params }),
  me:        ()            => api.get("/vendors/me"),
  myOrders:  ()            => api.get("/vendors/me/orders"),
  get:       (id)          => api.get(`/vendors/${id}`),
  orders:    (id)          => api.get(`/vendors/${id}/orders`),
  create:    (data)        => api.post("/vendors", data),
  update:    (id, data)    => api.patch(`/vendors/${id}`, data),
};

/* ── Admin ────────────────────────────────────────────── */
export const adminApi = {
  stats:        (fundraiserId) => api.get("/admin/stats", { params: { fundraiserId } }),
  listUsers:    ()             => api.get("/admin/users"),
  createUser:   (data)         => api.post("/admin/users", data),
  createVendor: (data)         => api.post("/admin/vendors", data),
};

/* ── Driver ───────────────────────────────────────────── */
export const driverApi = {
  getRoute:      (otp)             => api.get(`/driver/routes/${otp}`),
  completeStop:  (otp, stopIndex)  => api.patch(`/driver/routes/${otp}/stops/${stopIndex}/complete`),
  listRoutes:    (params)          => api.get("/driver/routes", { params }),
  createRoute:   (data)            => api.post("/driver/routes", data),
};

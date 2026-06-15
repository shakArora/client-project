import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: BASE,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("routed_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
  login:        (email, password, expectedRole) => api.post("/auth/login", { email, password, expectedRole }),
  googleAdmin:  (accessToken)     => api.post("/auth/google/admin",    { accessToken }),
  resetRequest: (email, channel)  => api.post("/auth/password-reset/request",  { email, channel }),
  resetConfirm: (token, newPw)    => api.post("/auth/password-reset/confirm",   { token, newPassword: newPw }),
};

/* ── Fundraisers ──────────────────────────────────────── */
export const fundraiserApi = {
  list:      ()           => api.get("/fundraisers"),
  mine:      ()           => api.get("/fundraisers/mine"),
  active:    ()           => api.get("/fundraisers/active"),
  bySlug:    (slug)       => api.get(`/fundraisers/by-slug/${slug}`),
  get:       (id)         => api.get(`/fundraisers/${id}`),
  create:    (data)       => api.post("/fundraisers", data),
  update:    (id, data)   => api.patch(`/fundraisers/${id}`, data),
  activate:  (id)         => api.patch(`/fundraisers/${id}/activate`),
  delete:    (id)         => api.delete(`/fundraisers/${id}`),
  export:    (id)         => api.get(`/fundraisers/${id}/export`),
  import:    (id, data)   => api.post(`/fundraisers/${id}/import`, data, { timeout: 300_000 }),
  validateImportAddresses: (id, orders) => api.post(`/fundraisers/${id}/import/validate-addresses`, { orders }, { timeout: 300_000 }),
  deleteAllOrders:  (id) => api.delete(`/fundraisers/${id}/orders`),
  deleteAllVendors: (id) => api.delete(`/fundraisers/${id}/vendors`),
  deleteAllDrivers: (id) => api.delete(`/fundraisers/${id}/drivers`),
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
  list:            (params)     => api.get("/orders", { params }),
  get:             (id)         => api.get(`/orders/${id}`),
  place:           (data)       => api.post("/orders", data),
  validateAddress: (address)    => api.post("/orders/validate-address", { address }),
  searchAddresses: (q)          => api.get("/orders/address-search", { params: { q } }),
  updateStatus:    (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updateAddress:   (id, deliveryAddress) => api.patch(`/orders/${id}/address`, { deliveryAddress }),
  refund:          (id)         => api.post(`/orders/${id}/refund`),
  delete:          (id)         => api.delete(`/orders/${id}`),
};

/* ── Vendors ──────────────────────────────────────────── */
export const vendorApi = {
  list:     (params)   => api.get("/vendors", { params }),
  me:       ()         => api.get("/vendors/me"),
  updateMe: (data)     => api.patch("/vendors/me", data),
  myOrders: ()         => api.get("/vendors/me/orders"),
  get:      (id)       => api.get(`/vendors/${id}`),
  create:   (data)     => api.post("/vendors", data),
  update:   (id, data) => api.patch(`/vendors/${id}`, data),
  delete:   (id)       => api.delete(`/vendors/${id}`),
};

/* ── Admin ────────────────────────────────────────────── */
export const adminApi = {
  stats:        (fundraiserId) => api.get("/admin/stats", { params: { fundraiserId } }),
  listUsers:    ()             => api.get("/admin/users"),
  createVendor: (data)         => api.post("/admin/vendors", data),
};

/* ── Driver ───────────────────────────────────────────── */
export const driverApi = {
  getRoute:       (otp)            => api.get(`/driver/routes/${otp}`),
  completeStop:   (otp, idx)       => api.patch(`/driver/routes/${otp}/stops/${idx}/complete`),
  listRoutes:     (params)         => api.get("/driver/routes", { params }),
  addDriver:      (data)           => api.post("/driver/drivers", data),
  deleteDriver:   (id)             => api.delete(`/driver/drivers/${id}`),
  generateRoutes: (fundraiserId)   => api.post("/driver/routes/generate", { fundraiserId }, { timeout: 300_000 }),
};

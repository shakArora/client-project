# Routed (Full Rewrite)

Routed is now a two-app monorepo:

- `frontend`: React + Vite UI for customers, vendors, drivers, and administrators.
- `backend`: Node + Express + MongoDB API with JWT auth scaffolding and role-aware routes.

The visual system uses a cream/gold/brown palette with rounded cards and serif + sans typography choices:

- Serif: `Cormorant Garamond` fallback chain (`Georgia`, etc.)
- Sans: `Inter` fallback chain (`Avenir Next`, `Segoe UI`, etc.)

## Project Structure

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── public/
│   │   └── _redirects
│   └── src/
└── package.json
```

## Environment Setup

### Backend

1. Copy `backend/.env.example` to `backend/.env`
2. Fill values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `ADMIN_GOOGLE_WHITELIST` (comma-separated admin emails)

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env`
2. Set:
   - `VITE_API_URL` (default `http://localhost:5000`)
   - `VITE_GOOGLE_CLIENT_ID` (for production GIS integration)

## Install Dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

## Run Locally

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Or run per app directly with each folder's scripts.

## Available API Areas

- `GET /api/health`
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/google/admin`
  - `POST /api/auth/password-reset/request`
  - `POST /api/auth/password-reset/confirm`
- Entities:
  - Vendors: `/api/vendors`
  - Fundraisers: `/api/fundraisers`
  - Products: `/api/products`
  - Orders: `/api/orders`
  - Driver routes + OTP access: `/api/driver/routes/:otp`

## Frontend MVP Routes

- `/` landing/home
- `/about` help/info
- `/login` role tabs + Google admin button scaffold
- `/vendor` vendor dashboard
- `/shop`, `/shop/:id`, `/checkout`, `/confirmation`
- `/driver-access`, `/driver/:otp`
- `/admin` sidebar dashboard (vendors/orders)

## Deployment Notes

- Frontend is Netlify-friendly (`frontend/public/_redirects` ensures SPA routing fallback).
- Build command for frontend:

```bash
npm run build:frontend
```

- Backend can be deployed to any Node host with MongoDB connectivity and environment variables set.

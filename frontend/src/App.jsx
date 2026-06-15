/**
 * Defines the React Router route table for all public, shop, customer, driver, vendor, and admin pages. Wraps protected routes with role-based authentication guards and redirects legacy admin paths.
 * @name Shivum Arora
 * @date 2026-06-09
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Landing                from './pages/Landing';
import About                  from './pages/About';
import Help                   from './pages/Help';
import Login                  from './pages/Login';
import RequestAccess           from './pages/RequestAccess';
import ResetPw                from './pages/ResetPassword';
import Shop                   from './pages/Shop';
import CustomerPage            from './pages/CustomerPage';
import CheckoutInfo            from './pages/CheckoutInfo';
import CheckoutPay             from './pages/CheckoutPay';
import Confirmation            from './pages/Confirmation';
import VendorCodes             from './pages/VendorCodes';
import VendorSales             from './pages/VendorSales';
import AdminDashboard          from './pages/AdminDashboard';
import AdminFundraiserDetail   from './pages/AdminFundraiserDetail';
import DriverAccess            from './pages/DriverAccess';
import DriverRoute             from './pages/DriverRoute';
import DriverDone              from './pages/DriverComplete';
import DriverDirect            from './pages/DriverDirect';

const ADM = 'administrator';
const VND = 'vendor';

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"                     element={<Landing />} />
      <Route path="/about"                element={<About />} />
      <Route path="/help"                 element={<Help />} />
      <Route path="/login"                element={<Login />} />
      <Route path="/signup"               element={<Navigate to="/request-access" replace />} />
      <Route path="/request-access"       element={<RequestAccess />} />
      <Route path="/reset-password"       element={<ResetPw />} />

      {/* ── Shop / checkout ── */}
      <Route path="/shop"                 element={<Shop />} />
      <Route path="/shop/info"            element={<CheckoutInfo />} />
      <Route path="/shop/pay"             element={<CheckoutPay />} />
      <Route path="/shop/confirmation"    element={<Confirmation />} />

      {/* ── Customer fundraiser page ── */}
      <Route path="/fundraiser/:slug"     element={<CustomerPage />} />

      {/* ── Driver (OTP-gated, no JWT required) ── */}
      <Route path="/driver"              element={<DriverAccess />} />
      <Route path="/driver/route"        element={<DriverRoute />} />
      <Route path="/driver/complete"     element={<DriverDone />} />
      {/* Direct OTP URL: /driver/ABCD12 */}
      <Route path="/driver/:otp"         element={<DriverDirect />} />

      {/* ── Vendor (JWT required, vendor role) ── */}
      <Route path="/vendor/codes" element={<ProtectedRoute role={VND}><VendorCodes /></ProtectedRoute>} />
      <Route path="/vendor/sales" element={<ProtectedRoute role={VND}><VendorSales /></ProtectedRoute>} />

      {/* ── Admin (JWT required, administrator role) ── */}
      <Route path="/admin"                    element={<ProtectedRoute role={ADM}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/fundraiser/:id"     element={<ProtectedRoute role={ADM}><AdminFundraiserDetail /></ProtectedRoute>} />

      {/* Legacy admin sub-paths — redirect to dashboard */}
      <Route path="/admin/vendors"      element={<Navigate to="/admin" replace />} />
      <Route path="/admin/orders"       element={<Navigate to="/admin" replace />} />
      <Route path="/admin/products"     element={<Navigate to="/admin" replace />} />
      <Route path="/admin/routes"       element={<Navigate to="/admin" replace />} />
      <Route path="/admin/fundraisers"  element={<Navigate to="/admin" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

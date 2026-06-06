import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute   from './components/ProtectedRoute';

import Landing          from './pages/Landing';
import About            from './pages/About';
import GetStarted       from './pages/GetStarted';
import Help             from './pages/Help';
import Login            from './pages/Login';
import Signup           from './pages/Signup';
import ResetPw          from './pages/ResetPassword';
import Shop             from './pages/Shop';
import CheckoutInfo     from './pages/CheckoutInfo';
import CheckoutPay      from './pages/CheckoutPay';
import Confirmation     from './pages/Confirmation';
import VendorCodes      from './pages/VendorCodes';
import VendorSales      from './pages/VendorSales';
import AdminDash        from './pages/AdminDashboard';
import AdminVendors     from './pages/AdminVendors';
import AdminOrders      from './pages/AdminOrders';
import AdminProducts    from './pages/AdminProducts';
import AdminRoutes      from './pages/AdminRoutes';
import AdminFundraisers from './pages/AdminFundraisers';
import DriverAccess     from './pages/DriverAccess';
import DriverRoute      from './pages/DriverRoute';
import DriverDone       from './pages/DriverComplete';

const ADM = 'administrator';
const VND = 'vendor';

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"                  element={<Landing />} />
      <Route path="/about"             element={<About />} />
      <Route path="/get-started"       element={<GetStarted />} />
      <Route path="/help"              element={<Help />} />
      <Route path="/login"             element={<Login />} />
      <Route path="/signup"            element={<Signup />} />
      <Route path="/reset-password"    element={<ResetPw />} />
      <Route path="/shop"              element={<Shop />} />
      <Route path="/shop/info"         element={<CheckoutInfo />} />
      <Route path="/shop/pay"          element={<CheckoutPay />} />
      <Route path="/shop/confirmation" element={<Confirmation />} />
      <Route path="/driver"            element={<DriverAccess />} />

      {/* ── Driver (OTP-gated, no JWT required) ── */}
      <Route path="/driver/route"    element={<DriverRoute />} />
      <Route path="/driver/complete" element={<DriverDone />} />

      {/* ── Vendor (JWT required, vendor role) ── */}
      <Route path="/vendor/codes" element={<ProtectedRoute role={VND}><VendorCodes /></ProtectedRoute>} />
      <Route path="/vendor/sales" element={<ProtectedRoute role={VND}><VendorSales /></ProtectedRoute>} />

      {/* ── Admin (JWT required, administrator role) ── */}
      <Route path="/admin"               element={<ProtectedRoute role={ADM}><AdminDash /></ProtectedRoute>} />
      <Route path="/admin/vendors"       element={<ProtectedRoute role={ADM}><AdminVendors /></ProtectedRoute>} />
      <Route path="/admin/orders"        element={<ProtectedRoute role={ADM}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/products"      element={<ProtectedRoute role={ADM}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/routes"        element={<ProtectedRoute role={ADM}><AdminRoutes /></ProtectedRoute>} />
      <Route path="/admin/fundraisers"   element={<ProtectedRoute role={ADM}><AdminFundraisers /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

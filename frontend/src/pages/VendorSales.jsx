import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vendorApi } from '../lib/api';
import { useAuth } from '../lib/auth';

function VendorNav() {
  const { logout } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Routed<span>.</span></Link>
      <div className="navbar-links hide-mobile">
        <Link to="/vendor/codes">My Codes</Link>
        <Link to="/vendor/sales" className="active">My Sales</Link>
      </div>
      <button onClick={logout} className="btn btn-dark btn-sm" style={{ borderRadius: 'var(--rpill)' }}>Sign Out</button>
    </nav>
  );
}

export default function VendorSales() {
  const [vendor,  setVendor]  = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([vendorApi.me(), vendorApi.myOrders()])
      .then(([vr, or]) => { setVendor(vr.data); setOrders(or.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <VendorNav />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '1.8rem 1.5rem 4rem' }}>
        {loading ? (
          <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', marginBottom: '.25rem' }}>
              {vendor?.fundraiserId?.title || 'Your Fundraiser'}
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.9rem', marginBottom: '1.2rem' }}>
              {vendor?.fundraiserId?.endDate
                ? `Ends ${new Date(vendor.fundraiserId.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Active Fundraiser'}
            </p>

            <div className="tab-bar" style={{ maxWidth: 420, marginBottom: '1.3rem' }}>
              <button><Link to="/vendor/codes" style={{ color: 'inherit', textDecoration: 'none' }}>🔗 My Codes</Link></button>
              <button className="active">📊 My Sales</button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem', marginBottom: '1.1rem' }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '2.6rem', fontWeight: 800, color: 'var(--gold-dk)', lineHeight: 1, marginBottom: '.35rem' }}>
                  {vendor?.bagsSold || 0}
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '.88rem' }}>Bags Sold</p>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '2.6rem', fontWeight: 800, color: 'var(--t1)', lineHeight: 1, marginBottom: '.35rem' }}>
                  ${(vendor?.totalRevenue || 0).toFixed(2)}
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '.88rem' }}>Total Revenue</p>
              </div>
            </div>

            {/* Recent orders */}
            <div className="card">
              <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.85rem' }}>
                Recent Orders
              </p>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '1.5rem 0', fontSize: '.92rem' }}>No orders yet — share your link!</p>
              ) : (
                orders.map(o => (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.7rem 0', borderBottom: '1px solid var(--border-lt)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: '.15rem' }}>{o.customerName}</p>
                      <p style={{ color: 'var(--t3)', fontSize: '.8rem' }}>
                        {new Date(o.createdAt).toLocaleDateString()} · {o.totalBags} bag{o.totalBags !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <strong style={{ color: 'var(--gold-dk)', fontSize: '.95rem' }}>${o.totalAmount?.toFixed(2)}</strong>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

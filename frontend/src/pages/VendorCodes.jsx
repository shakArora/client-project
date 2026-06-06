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
        <Link to="/vendor/codes" className="active">My Codes</Link>
        <Link to="/vendor/sales">My Sales</Link>
      </div>
      <button onClick={logout} className="btn btn-dark btn-sm" style={{ borderRadius: 'var(--rpill)' }}>
        Sign Out
      </button>
    </nav>
  );
}

export default function VendorCodes() {
  const { user } = useAuth();
  const [vendor,  setVendor]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    vendorApi.me()
      .then(r => setVendor(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shopUrl = vendor
    ? `${window.location.origin}/shop?ref=${vendor.referralCode}&f=${vendor.fundraiserId?._id || ''}`
    : '';

  function copyLink() {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fundraiser = vendor?.fundraiserId;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <VendorNav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.8rem 1.5rem 4rem' }}>
        {loading ? (
          <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', marginBottom: '.25rem' }}>
              {fundraiser?.title || 'Your Fundraiser'}
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.9rem', marginBottom: '1.2rem' }}>
              {fundraiser?.endDate
                ? `Ends ${new Date(fundraiser.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Active Fundraiser'}
            </p>

            <div className="tab-bar" style={{ maxWidth: 420, marginBottom: '1.4rem' }}>
              <button className="active">🔗 My Codes</button>
              <button><Link to="/vendor/sales" style={{ color: 'inherit', textDecoration: 'none' }}>📊 My Sales</Link></button>
            </div>

            {/* Shop link */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.7rem' }}>Your Shop Link</p>
              <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input readOnly value={shopUrl} style={{ flex: 1, minWidth: 180, border: '1.5px solid var(--border)', borderRadius: 'var(--r3)', background: '#FFFDF6', padding: '.72rem .9rem', fontSize: '.88rem', color: 'var(--t3)' }} />
                <button className="btn btn-gold btn-sm" onClick={copyLink}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--t3)', marginTop: '.55rem' }}>
                Share this link — every order using it is credited to you automatically.
              </p>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
              <div className="card">
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.5rem' }}>Referral Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: '2.6rem', fontWeight: 800, color: 'var(--gold-dk)', letterSpacing: '.04em' }}>
                    {vendor?.referralCode || '——'}
                  </span>
                  <button className="btn btn-dark btn-sm" onClick={copyLink}>Share</button>
                </div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.65rem' }}>QR Code</p>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r2)', padding: '1.2rem', display: 'inline-block', cursor: 'pointer', marginBottom: '.55rem' }}>
                  <span style={{ fontSize: '2.2rem', display: 'block', lineHeight: 1 }}>▦</span>
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Tap to save or print</p>
              </div>

              <div className="card">
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.8rem' }}>My Stats</p>
                {[
                  { label: 'Bags Sold', value: vendor?.bagsSold || 0, gold: true },
                  { label: 'Revenue',   value: `$${(vendor?.totalRevenue || 0).toFixed(2)}` },
                  { label: 'Orders',    value: vendor?.orderCount || 0 },
                ].map(({ label, value, gold }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-lt)', paddingBottom: '.45rem', marginBottom: '.45rem' }}>
                    <span style={{ color: 'var(--t2)', fontSize: '.9rem' }}>{label}</span>
                    <strong style={{ color: gold ? 'var(--gold-dk)' : 'var(--t1)', fontSize: '.9rem' }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
      <style>{`@media(max-width:768px){div[style*="repeat(3,1fr)"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'Shop', to: '/shop' }, { label: 'About', to: '/about' }];

const ROLES = [
  { icon: '🔗', role: 'Vendor',        body: 'Gets shop links, QR codes, and a personal sales dashboard. Share your referral code and track every order attributed to you.' },
  { icon: '🛒', role: 'Customer',      body: 'Browses the fundraiser page, selects products, enters delivery details, and pays online. Receives an email confirmation.' },
  { icon: '⚙️', role: 'Administrator', body: 'Creates fundraisers, manages vendors and products, views all orders, plans delivery routes, and tracks progress on delivery day.' },
  { icon: '🚚', role: 'Driver',        body: 'Logs in with a 6-character one-time code and receives an optimized stop-by-stop delivery route with map app links.' },
];

export default function Help() {
  return (
    <div className="page">
      <Navbar links={NAV} />

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,4vw,2.8rem)', marginBottom: '.6rem' }}>Help & Use Cases</h1>
        <p style={{ color: 'var(--t3)', marginBottom: '2rem', fontSize: '.97rem' }}>
          How each role uses Routed and what every part of the platform does.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
          {ROLES.map(({ icon, role, body }) => (
            <div key={role} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem' }}>{role}</h3>
              </div>
              <p style={{ color: 'var(--t3)', lineHeight: 1.6, fontSize: '.9rem' }}>{body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-gold">Log In</Link>
          <Link to="/signup" className="btn btn-dark">Create Account</Link>
        </div>
      </main>

      <style>{`@media(max-width:640px){div[style*="repeat(2,1fr)"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

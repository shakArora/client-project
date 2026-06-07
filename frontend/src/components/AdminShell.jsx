import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const SIDEBAR_LINKS = [
  { icon: '📊', label: 'Overview',       to: '/admin' },
  { icon: '📣', label: 'Fundraisers',    to: '/admin/fundraisers' },
  { icon: '📦', label: 'Products',       to: '/admin/products' },
  { icon: '👥', label: 'Vendors',        to: '/admin/vendors' },
  { icon: '🛒', label: 'Orders',         to: '/admin/orders' },
  { icon: '🗺️', label: 'Route Planning', to: '/admin/routes' },
];

export default function AdminShell({ children, fundraiser }) {
  const { pathname }   = useLocation();
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (to) =>
    to === '/admin' ? pathname === '/admin' : pathname.startsWith(to);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 230, background: 'var(--dark)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Brand */}
        <div style={{ padding: '1.3rem 1.1rem .8rem', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Link to="/" style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', textDecoration: 'none' }}>
            Routed<span style={{ color: 'var(--gold)' }}>.</span>
          </Link>
        </div>

        {/* Fundraiser context */}
        <div style={{ padding: '.8rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          {fundraiser ? (
            <>
              <p style={{ fontSize: '.64rem', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--t-gold)', marginBottom: '.2rem' }}>
                {fundraiser.location?.city || 'Active'} {fundraiser.location?.state || ''}
              </p>
              <p style={{ color: '#e8d8be', fontWeight: 700, fontSize: '.88rem', marginBottom: '.45rem', lineHeight: 1.3 }}>
                {fundraiser.title}
              </p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', background: fundraiser.isActive ? 'var(--green-bg)' : 'var(--orange-bg)', color: fundraiser.isActive ? 'var(--green)' : 'var(--orange)', borderRadius: 'var(--rpill)', padding: '.18rem .6rem', fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {fundraiser.isActive ? '● LIVE' : '○ PAUSED'}
              </span>
            </>
          ) : (
            <Link to="/admin/fundraisers" style={{ color: 'var(--gold)', fontSize: '.85rem', fontWeight: 700 }}>
              + Create Fundraiser
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '.5rem 0' }}>
          {SIDEBAR_LINKS.map(({ icon, label, to }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.68rem 1.1rem', color: active ? '#fff' : '#b0a090', fontWeight: active ? 700 : 500, fontSize: '.87rem', background: active ? 'rgba(195,162,86,.18)' : 'transparent', borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent', textDecoration: 'none', transition: 'background .15s' }}>
                <span style={{ fontSize: '.95rem' }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '.9rem 1.1rem', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <p style={{ color: '#b0a090', fontSize: '.8rem', marginBottom: '.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || 'Admin'}
          </p>
          <button onClick={handleLogout} className="btn btn-outline-lt btn-full btn-sm" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: 60, background: 'var(--bg)', borderBottom: '1px solid var(--border-lt)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', gap: '1.2rem' }}>
            {SIDEBAR_LINKS.map(({ label, to }) => (
              <Link key={to} to={to} style={{ fontSize: '.85rem', fontWeight: isActive(to) ? 700 : 500, color: isActive(to) ? 'var(--t1)' : 'var(--t3)', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
          <button onClick={handleLogout} className="btn btn-dark btn-sm" style={{ borderRadius: 'var(--rpill)' }}>
            {user?.name?.split(' ')[0] || 'Admin'} · Sign Out
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth, ROLES } from '../lib/auth';

export default function Navbar({
  links = [],
  actionLabel = 'Log In',
  actionTo = '/login',
  actionStyle = 'btn btn-gold btn-sm',
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const dashboardTo = user?.role === ROLES.ADMIN ? '/admin' : user?.role === ROLES.VENDOR ? '/vendor/codes' : null;
  const ctaTo = dashboardTo || actionTo;
  const ctaLabel = dashboardTo ? 'Dashboard' : actionLabel;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <nav className={`navbar ${open ? 'navbar--open' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand" onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            if (pathname === '/') {
              window.history.replaceState(null, '', '/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/');
            }
          }}>
            Routed<span>.</span>
          </Link>

          <div className="navbar-links hide-mobile">
            {links.map(({ label, to }) => (
              <Link key={to} to={to} className={pathname === to ? 'active' : ''}>
                {label}
              </Link>
            ))}
          </div>

          <div className="navbar-end">
            <Link to={ctaTo} className={`${actionStyle} hide-mobile`} onClick={() => setOpen(false)}>
              {ctaLabel}
            </Link>
            {(links.length > 0 || actionLabel) && (
              <button
                type="button"
                className="navbar-menu-btn"
                onClick={() => setOpen(v => !v)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        <div className={`navbar-dropdown ${open ? 'navbar-dropdown--open' : ''}`}>
          <div className="navbar-dropdown-inner">
            {links.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className={`navbar-dropdown-link ${pathname === to ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link to={ctaTo} className="navbar-dropdown-cta" onClick={() => setOpen(false)}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      </nav>

      {open && (
        <button
          type="button"
          className="navbar-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

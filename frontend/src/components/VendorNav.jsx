import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function VendorNav({ userName = 'Vendor' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const tabs = [
    { label: 'My Codes', to: '/vendor/codes' },
    { label: 'My Sales', to: '/vendor/sales' },
  ];

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  return (
    <>
      <nav className={`vendor-nav ${open ? 'vendor-nav--open' : ''}`}>
        <div className="vendor-nav-inner">
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            Routed<span>.</span>
          </Link>

          <div className="vendor-nav-tabs hide-mobile">
            {tabs.map(tab => (
              <Link
                key={tab.to}
                to={tab.to}
                className={pathname === tab.to ? 'active' : ''}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="vendor-nav-end">
            <button type="button" className="vendor-nav-user hide-mobile" onClick={handleLogout}>
              Hi, {userName}
            </button>
            <button
              type="button"
              className="navbar-menu-btn"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className={`navbar-dropdown vendor-nav-dropdown ${open ? 'navbar-dropdown--open' : ''}`}>
          <div className="navbar-dropdown-inner">
            <p className="vendor-nav-greeting">Hi, {userName}</p>
            {tabs.map(tab => (
              <Link
                key={tab.to}
                to={tab.to}
                className={`navbar-dropdown-link ${pathname === tab.to ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {tab.label}
              </Link>
            ))}
            <button type="button" className="navbar-dropdown-link navbar-dropdown-logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <button type="button" className="navbar-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
      )}
    </>
  );
}

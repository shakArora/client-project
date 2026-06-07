import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ links = [], actionLabel = 'Log In', actionTo = '/login', actionStyle = 'btn btn-gold btn-sm' }) {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Routed<span>.</span>
      </Link>

      <div className="navbar-links hide-mobile">
        {links.map(({ label, to }) => (
          <Link key={to} to={to} className={pathname === to ? 'active' : ''}>
            {label}
          </Link>
        ))}
      </div>

      <Link to={actionTo} className={actionStyle}>
        {actionLabel}
      </Link>
    </nav>
  );
}

/**
 * Marketing-site navigation with scroll-aware styling for the landing page and simpler links on subpages.
 * Supports anchor links, mobile drawer menu, and a login/dashboard call-to-action based on auth state.
 * @author Shivum Arora
 * @date 6/14/2026
 */
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth, ROLES } from '../lib/auth';

const DEFAULT_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'About', to: '/about' },
];

const SUBPAGE_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Help', to: '/help' },
  { label: 'About', to: '/about' },
];

export default function SiteNav({
  links,
  actionLabel = 'Login',
  actionTo = '/login',
  scrollLinks = true,
  subpage = false,
}) {
  const navLinks = links ?? (subpage ? SUBPAGE_LINKS : DEFAULT_LINKS);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const dashboardTo = user?.role === ROLES.ADMIN ? '/admin'
    : user?.role === ROLES.VENDOR ? '/vendor/codes'
    : null;

  function goHome(e) {
    e.preventDefault();
    setOpen(false);
    if (pathname === '/') {
      window.history.replaceState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  function handleNav(item) {
    setOpen(false);
    if (item.to) return;
    if (scrollLinks && item.href?.startsWith('#')) {
      if (pathname === '/') {
        document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = `/${item.href}`.replace('//', '/');
      }
    }
  }

  const navItems = navLinks.map(item => {
    if (item.to) {
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={`site-nav-link ${pathname === item.to ? 'active' : ''}`}
        >
          {item.label}
        </Link>
      );
    }
    return (
      <button
        key={item.href}
        type="button"
        onClick={() => handleNav(item)}
        className="site-nav-link"
      >
        {item.label}
      </button>
    );
  });

  return (
    <>
      <header className={`site-nav ${scrolled ? 'site-nav--scrolled' : ''} ${open ? 'site-nav--open' : ''}`}>
        <div className="site-nav-inner">
          <Link to="/" className="site-nav-brand" onClick={goHome}>
            Routed<span>.</span>
          </Link>

          <nav className="site-nav-links hide-mobile">{navItems}</nav>

          <div className="site-nav-actions">
            {user && dashboardTo ? (
              <Link to={dashboardTo} className="site-nav-cta hide-mobile" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <Link to={actionTo} className="site-nav-cta hide-mobile" onClick={() => setOpen(false)}>
                {actionLabel}
              </Link>
            )}
            <button
              type="button"
              className="site-nav-menu-btn"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div className={`site-nav-dropdown ${open ? 'site-nav-dropdown--open' : ''}`}>
          <div className="site-nav-dropdown-inner">
            {navLinks.map(item => (
              item.to ? (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`site-nav-dropdown-link ${pathname === item.to ? 'active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.href}
                  type="button"
                  className="site-nav-dropdown-link"
                  onClick={() => handleNav(item)}
                >
                  {item.label}
                </button>
              )
            ))}
            {user && dashboardTo ? (
              <>
                <Link to={dashboardTo} className="site-nav-dropdown-cta" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="site-nav-dropdown-link"
                  onClick={() => { logout(); setOpen(false); navigate('/'); }}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to={actionTo} className="site-nav-dropdown-cta" onClick={() => setOpen(false)}>
                {actionLabel}
              </Link>
            )}
          </div>
        </div>
      </header>

      {open && (
        <button
          type="button"
          className="site-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

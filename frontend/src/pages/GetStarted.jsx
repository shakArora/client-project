import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'About', to: '/about' }];

const FEATURES = [
  { icon: '📦', title: 'Create Fundraisers',  body: 'Build your selling page, set products & prices' },
  { icon: '👥', title: 'Manage Vendors',       body: 'Invite scouts, view individual sales' },
  { icon: '🚚', title: 'Route Planning',       body: 'Auto-assign delivery routes to drivers' },
  { icon: '📊', title: 'Reports & History',    body: 'View past fundraiser performance' },
];

export default function GetStarted() {
  return (
    <div className="page">
      <Navbar links={NAV} actionLabel="Log In" actionTo="/login" />

      <main style={{ maxWidth: 580, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>
        {/* Gold pill */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="title-pill">Get Started</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,4vw,2.6rem)', textAlign: 'center', marginBottom: '.75rem' }}>
          Run Smarter Fundraisers
        </h1>
        <p style={{ color: 'var(--t3)', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.8rem', fontSize: '.95rem' }}>
          Routed gives troop administrators everything needed to manage a mulch
          fundraiser from creation to delivery day.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginBottom: '1.8rem' }}>
          {FEATURES.map(({ icon, title, body }) => (
            <div key={title} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.1rem' }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.15rem' }}>{title}</p>
                <p style={{ color: 'var(--t3)', fontSize: '.84rem' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/signup"
          className="btn btn-dark btn-full btn-lg"
          style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}
        >
          Join as Admin →
        </Link>
      </main>
    </div>
  );
}

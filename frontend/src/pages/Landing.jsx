import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [
  { label: 'About',       to: '/about' },
  { label: 'Get Started', to: '/get-started' },
];

export default function Landing() {
  return (
    <div className="page">
      <Navbar links={NAV} />

      {/* ── Hero ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr' }}>
        {/* Dark panel */}
        <div style={{
          background: 'var(--dark)',
          padding: 'clamp(2rem,5vw,3.5rem)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 440,
        }}>
          <p style={{
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            fontSize: '.7rem',
            fontWeight: 700,
            color: 'var(--t-gold)',
            marginBottom: '.9rem',
          }}>
            Community Fundraising Platform
          </p>

          <h1 style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(2.8rem,5vw,4.2rem)',
            lineHeight: 1.02,
            color: 'var(--t-cream)',
            marginBottom: '1.1rem',
          }}>
            Fundraisers<br />
            <em style={{ color: 'var(--gold-lt)', fontStyle: 'italic' }}>Made Easy.</em>
          </h1>

          <p style={{ color: '#c8baa4', lineHeight: 1.55, maxWidth: 440, marginBottom: '1.6rem', fontSize: '.95rem' }}>
            A website designed from Boy Scouts for any organization. Easy to use, yet
            powerful features to streamline the process.
          </p>

          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <Link to="/shop" className="btn btn-gold btn-lg">
              Find Fundraiser ▾
            </Link>
            <Link to="/help" className="btn btn-outline-lt btn-lg">
              Learn More
            </Link>
          </div>
        </div>

        {/* Gold panel */}
        <div style={{
          background: 'linear-gradient(145deg,#C9A862 0%,#9A7535 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 440,
          gap: '1rem',
        }}>
          <div style={{ fontSize: '5rem', lineHeight: 1 }}>🌲</div>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Hero image
          </p>
        </div>
      </div>

      {/* ── Feature row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        borderTop: '1px solid var(--border-lt)',
        borderBottom: '1px solid var(--border-lt)',
      }}>
        {[
          { icon: '📦', title: 'Easy Online Orders',   body: 'Customers shop from your custom fundraiser page.' },
          { icon: '🗺️',  title: 'Auto Route Planning',  body: 'Delivery routes are auto-assigned and optimized.' },
          { icon: '📊', title: 'Real-Time Tracking',   body: 'Live delivery dashboard on the big day.' },
        ].map(({ icon, title, body }, i) => (
          <div key={i} style={{
            padding: '1.5rem 1.8rem',
            borderRight: i < 2 ? '1px solid var(--border-lt)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '.4rem',
          }}>
            <span style={{ fontSize: '1.4rem' }}>{icon}</span>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
            <p style={{ color: 'var(--t3)', fontSize: '.88rem', lineHeight: 1.5 }}>{body}</p>
          </div>
        ))}
      </div>

      {/* ── Mobile-only extra nav ── */}
      <div style={{
        display: 'none',
        padding: '1.25rem 1rem',
        flexDirection: 'column',
        gap: '.65rem',
      }} className="mobile-extra-nav">
        <Link to="/shop" className="btn btn-gold btn-full btn-lg" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Find Fundraiser ▾
        </Link>
        <Link to="/driver" className="btn btn-outline btn-full btn-lg" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Enter Driver Code ▲
        </Link>
        <Link to="/about" className="btn btn-outline btn-full" style={{ marginTop: '.3rem' }}>
          About
        </Link>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-extra-nav { display: flex !important; }
          div[style*="grid-template-columns: 1.15fr"] { grid-template-columns: 1fr !important; }
          div[style*="repeat(3,1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

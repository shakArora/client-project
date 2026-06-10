import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';

export default function RequestAccess() {
  return (
    <div className="marketing-dark">
      <SiteNav subpage actionLabel="Log In" actionTo="/login" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '7rem 1.5rem 5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,4vw,2.4rem)', marginBottom: '.75rem' }}>
          Request Admin Access
        </h1>
        <p style={{ color: 'var(--t3)', lineHeight: 1.65, marginBottom: '1.8rem', fontSize: '.95rem' }}>
          Routed admin accounts are created by our team to ensure your fundraiser runs smoothly.
          Send us an email and we'll get you set up within 24 hours.
        </p>

        <a
          href="mailto:contact.routed@gmail.com?subject=Admin Access Request&body=Hi, I'd like to set up a Routed admin account for my organization.%0A%0AOrganization name: %0AContact name: %0APhone number: "
          className="btn btn-gold btn-lg"
          style={{ marginBottom: '1rem', display: 'inline-flex' }}
        >
          Email contact.routed@gmail.com →
        </a>

        <p style={{ color: 'var(--t3)', fontSize: '.85rem', marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--gold-dk)', fontWeight: 700 }}>Log in here</Link>
        </p>
      </main>
    </div>
  );
}

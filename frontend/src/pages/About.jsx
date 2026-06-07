import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'Get Started', to: '/get-started' }];

export default function About() {
  const steps = [
    'Customers order mulch online from your fundraiser page',
    'Routes are automatically planned and assigned to drivers',
    'Mulch is delivered and tracked in real time on delivery day',
  ];

  return (
    <div className="page">
      <Navbar links={NAV} />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>
        <div style={{ marginBottom: '1.6rem' }}>
          <span className="title-pill">About Routed</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.55rem', marginBottom: '.7rem' }}>
              Our Mission
            </h2>
            <p style={{ color: 'var(--t2)', lineHeight: 1.6, fontSize: '.97rem' }}>
              Routed empowers scout troops and youth organizations to run seamless
              mulch fundraisers — from online ordering to route-optimized delivery.
            </p>
          </div>

          <div className="card">
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.55rem', marginBottom: '1rem' }}>
              How It Works
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start' }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--gold)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.8rem', fontWeight: 700,
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <p style={{ color: 'var(--t2)', lineHeight: 1.55, fontSize: '.97rem', paddingTop: 4 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '.5rem', textAlign: 'center' }}>
            <Link to="/get-started" className="btn btn-gold btn-lg">Get Started</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

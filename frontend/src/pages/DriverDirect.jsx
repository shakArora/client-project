import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../lib/api';

export default function DriverDirect() {
  const { otp }    = useParams();
  const navigate   = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = otp?.toUpperCase();
    if (!code || code.length !== 6) {
      setError('Invalid driver code in URL.');
      return;
    }
    driverApi.getRoute(code)
      .then(() => {
        localStorage.setItem('routed_driver_otp', code);
        navigate('/driver/route', { replace: true });
      })
      .catch(() => {
        setError(`Code "${code}" not found. Please check with your administrator.`);
      });
  }, [otp, navigate]);

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', color: '#fff', marginBottom: '1rem' }}>
        Routed<span style={{ color: 'var(--gold)' }}>.</span>
      </div>
      <div style={{ background: 'rgba(191,53,53,.15)', border: '1px solid rgba(191,53,53,.4)', borderRadius: '12px', padding: '1rem 1.5rem', color: '#ff9090', maxWidth: 360, marginBottom: '1.5rem' }}>
        {error}
      </div>
      <a href="/driver" style={{ color: 'var(--gold-lt)', fontSize: '.9rem' }}>← Try entering your code manually</a>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--t-gold)', fontSize: '1rem' }}>Loading your route…</p>
    </div>
  );
}

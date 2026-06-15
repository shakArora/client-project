/**
 * Driver login page with a six-character OTP entry form.
 * Validates the code against the driver API, stores it locally, and redirects to the active route view.
 * @author Shivum Arora
 * @date 6/11/2026
 */
import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { driverApi } from '../lib/api';

export default function DriverAccess() {
  const navigate = useNavigate();
  const [otp,     setOtp]     = useState(['','','','','','']);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  function handleChange(val, i) {
    const updated = [...otp];
    updated[i] = val.slice(-1).toUpperCase();
    setOtp(updated);
    if (val && i < 5) refs.current[i + 1]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = otp.join('').toUpperCase();
    if (code.length < 6) { setError('Enter all 6 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await driverApi.getRoute(code);
      localStorage.setItem('routed_driver_otp', code);
      navigate('/driver/route');
    } catch {
      setError('Code not found. Check with your administrator.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="driver-portal">
      <div className="driver-portal-header">
        <Link to="/" className="driver-portal-brand">
          Routed<span>.</span>
        </Link>
        <p className="driver-portal-label">Driver Portal</p>
      </div>

      <main className="driver-portal-main">
        <div className="driver-portal-card">
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,4vw,2.5rem)', color: '#fff', marginBottom: '.65rem' }}>
          Enter Driver Code
        </h1>
        <p style={{ color: '#b0a090', lineHeight: 1.6, marginBottom: '2rem', maxWidth: 380, fontSize: '.93rem' }}>
          Your 6-character code was provided by the administrator. Enter it to access your delivery route.
        </p>

        {error && (
          <div style={{ background: 'rgba(191,53,53,.15)', border: '1px solid rgba(191,53,53,.4)', borderRadius: 'var(--r2)', padding: '.7rem 1.2rem', color: '#ff9090', fontSize: '.88rem', marginBottom: '1.2rem', maxWidth: 380 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '.45rem' }}>
            {otp.map((ch, i) => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                value={ch}
                onChange={e => handleChange(e.target.value, i)}
                maxLength={1}
                style={{
                  width: 52, height: 56,
                  borderRadius: 'var(--r2)',
                  border: '1.5px solid rgba(255,255,255,.18)',
                  background: 'rgba(255,255,255,.07)',
                  textAlign: 'center', fontSize: '1.25rem', fontWeight: 700,
                  color: 'var(--gold-lt)', textTransform: 'uppercase', outline: 'none',
                }}
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-lg"
            disabled={loading}
            style={{ textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 260, marginTop: '.5rem' }}
          >
            {loading ? 'Checking…' : 'Access My Route →'}
          </button>
        </form>
        </div>
      </main>
    </div>
  );
}

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi, driverApi } from '../lib/api';
import { useAuth, ROLES } from '../lib/auth';

const TABS = ['Vendor', 'Administrator'];

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [tab,     setTab]     = useState('Vendor');
  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [otp,     setOtp]     = useState(['','','','','','']);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef([]);

  // ── Email / password login ─────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      login(data.token, data.user);
      redirect(data.user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // ── Google login (admin only) ─────────────────────
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResp) => {
      setError(''); setLoading(true);
      try {
        const { data } = await authApi.googleAdmin(tokenResp.access_token);
        login(data.token, data.user);
        navigate('/admin');
      } catch (err) {
        setError(err.response?.data?.message || 'Google login failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google login cancelled.'),
  });

  // ── Driver OTP login ──────────────────────────────
  async function handleOtpSubmit(e) {
    e.preventDefault();
    const code = otp.join('').toUpperCase();
    if (code.length < 6) { setError('Enter your full 6-character code.'); return; }
    setError(''); setLoading(true);
    try {
      await driverApi.getRoute(code);
      localStorage.setItem('routed_driver_otp', code);
      navigate('/driver/route');
    } catch {
      setError('Driver code not found. Check with your administrator.');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(val, i) {
    const updated = [...otp];
    updated[i] = val.slice(-1).toUpperCase();
    setOtp(updated);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function redirect(role) {
    if (role === ROLES.ADMIN)   navigate('/admin');
    else if (role === ROLES.VENDOR) navigate('/vendor/codes');
    else navigate('/driver');
  }

  return (
    <div className="page" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">Routed<span>.</span></Link>
        <div className="navbar-links hide-mobile">
          <Link to="/shop">Shop</Link>
          <Link to="/about">About</Link>
        </div>
        <Link to="/signup" className="btn btn-gold btn-sm">Sign Up</Link>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        {/* Dark left panel */}
        <div style={{ background: 'var(--dark)', padding: 'clamp(2rem,5vw,3.5rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,4vw,3rem)', color: '#fff', marginBottom: '.75rem' }}>
            Welcome Back.
          </h1>
          <p style={{ color: '#c8b89a', lineHeight: 1.6, marginBottom: '1.8rem', fontSize: '.95rem', maxWidth: 380 }}>
            Sign in to manage your fundraiser, track your sales, or access your delivery route.
          </p>
          {[
            { icon: '🔗', text: 'Vendor — track your personal sales' },
            { icon: '⚙️', text: 'Administrator — manage your fundraiser' },
            { icon: '🚚', text: 'Driver — enter your route code' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.65rem' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(195,162,86,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem' }}>{icon}</span>
              <p style={{ color: '#e0d0b8', fontSize: '.9rem' }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Form panel */}
        <div style={{ padding: 'clamp(1.5rem,4vw,3rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.2rem' }}>
          {/* Role tabs */}
          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--red)', fontSize: '.88rem' }}>
              {error}
            </div>
          )}

          {/* Credentials form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            <div className="field">
              <label>Email Address</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div style={{ textAlign: 'right', marginTop: '-.4rem' }}>
              <Link to="/reset-password" style={{ fontSize: '.83rem', color: 'var(--t3)' }}>Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn-gold btn-lg btn-full" disabled={loading} style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>

            {tab === 'Administrator' && googleClientId && (
              <div style={{ padding: '.9rem', border: '1.5px dashed var(--border)', borderRadius: 'var(--r3)', textAlign: 'center' }}>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginBottom: '.7rem' }}>Or continue with Google (admin only)</p>
                <button type="button" onClick={() => googleLogin()} className="btn btn-outline btn-full" disabled={loading}>
                  🔵 Continue with Google
                </button>
              </div>
            )}
          </form>

          {/* Driver OTP */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r3)', padding: '1rem 1.1rem', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.75rem' }}>
              Driver? Enter Your Code
            </p>
            <form onSubmit={handleOtpSubmit}>
              <div className="otp-group" style={{ marginBottom: '.7rem' }}>
                {otp.map((ch, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    value={ch}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    maxLength={1}
                    style={{
                      width: 46, height: 50, borderRadius: 'var(--r2)',
                      border: '1.5px solid var(--border)', background: '#FFFDF6',
                      textAlign: 'center', fontSize: '1.1rem', fontWeight: 700,
                      textTransform: 'uppercase', outline: 'none',
                    }}
                    onFocus={e => e.target.select()}
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-dark btn-full btn-sm" disabled={loading}>
                {loading ? 'Checking…' : 'Access My Route →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--t3)' }}>
            No account?{' '}
            <Link to="/signup" style={{ color: 'var(--gold)', fontWeight: 700 }}>Sign Up</Link>
          </p>
        </div>
      </div>

      <style>{`@media(max-width:768px){div[style*="1fr 1.1fr"]{grid-template-columns:1fr!important}div[style*="background: var(--dark)"]{display:none!important}}`}</style>
    </div>
  );
}

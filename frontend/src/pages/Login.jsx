import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import { authApi, driverApi } from '../lib/api';
import { useAuth, ROLES } from '../lib/auth';

const TABS = ['Vendor', 'Administrator'];

const ROLE_CARDS = [
  { icon: '🔗', title: 'Vendor', desc: 'Track your personal sales and share your shop link.' },
  { icon: '⚙️', title: 'Administrator', desc: 'Manage fundraisers, routes, and your whole troop.' },
  { icon: '🚚', title: 'Driver', desc: 'Enter your 6-character code for your delivery route.' },
];

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const expectedRole = tab === 'Vendor' ? ROLES.VENDOR : ROLES.ADMIN;
      const { data } = await authApi.login(email, password, expectedRole);

      login(data.token, data.user);
      redirect(data.user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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
    <div className="landing-page login-page">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="login-page-glow" aria-hidden="true" />

      <SiteNav
        subpage
        actionLabel="Request Access"
        actionTo="/request-access"
      />

      <main className="login-page-main">
        <div className="login-page-grid">
          <section className="login-page-hero">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-dot" />
              Portal access
            </div>
            <h1 className="landing-headline login-headline">
              Welcome <em>back.</em>
            </h1>
            <p className="landing-sub login-sub">
              Sign in to manage your fundraiser, track sales, or open your delivery route — all in one place.
            </p>

            <div className="login-role-grid">
              {ROLE_CARDS.map(({ icon, title, desc }) => (
                <div key={title} className="login-role-card">
                  <span className="login-role-icon">{icon}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="login-panel">
            <div className="login-glass-card">
              <div className="login-card-header">
                <h2>Sign in</h2>
                <p>Choose your role and enter your credentials.</p>
              </div>

              <div className="login-tab-switch">
                {TABS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={tab === t ? 'active' : ''}
                    onClick={() => { setTab(t); setError(''); }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {error && <div className="login-alert">{error}</div>}

              <form className="login-form" onSubmit={handleSubmit}>
                <label className="login-field">
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label className="login-field">
                  <span>Password</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </label>
                <div className="login-forgot-row">
                  <Link to="/reset-password">Forgot password?</Link>
                </div>
                <button type="submit" className="glass-btn glass-btn--gold login-submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                  {!loading && <ArrowRight size={18} />}
                </button>

                {tab === 'Administrator' && googleClientId && (
                  <div className="login-divider">
                    <span>or</span>
                  </div>
                )}
                {tab === 'Administrator' && googleClientId && (
                  <button
                    type="button"
                    className="glass-btn login-google-btn"
                    onClick={() => googleLogin()}
                    disabled={loading}
                  >
                    Sign in with Google
                  </button>
                )}
              </form>
            </div>

            <div className="login-glass-card login-driver-card">
              <p className="login-driver-title">Driver access</p>
              <p className="login-driver-desc">Enter the 6-character code from your administrator.</p>
              <form onSubmit={handleOtpSubmit}>
                <div className="login-otp-row">
                  {otp.map((ch, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      className="login-otp-cell"
                      value={ch}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      maxLength={1}
                      aria-label={`Driver code character ${i + 1}`}
                      onFocus={e => e.target.select()}
                    />
                  ))}
                </div>
                <button type="submit" className="glass-btn login-driver-btn" disabled={loading}>
                  {loading ? 'Checking…' : 'Access My Route'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            </div>

            <p className="login-footer">
              Need admin access?{' '}
              <Link to="/request-access">Request it here</Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

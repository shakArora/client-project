/**
 * Renders a self-service administrator registration form (currently blocked by the backend). Attempts to register via the auth API and redirect to the admin dashboard on success.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Signup() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register({
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     'administrator',
      });
      login(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">Routed<span>.</span></Link>
        <Link to="/login" className="btn btn-gold btn-sm">Log In</Link>
      </nav>

      <main style={{ maxWidth: 520, margin: '3rem auto', padding: '0 1.25rem 4rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.9rem,4vw,2.5rem)', marginBottom: '.4rem', textAlign: 'center' }}>
          Join Routed
        </h1>
        <p style={{ color: 'var(--t3)', textAlign: 'center', marginBottom: '2rem' }}>Create an Administrator account.</p>

        {error && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          <div className="field">
            <label>Full Name</label>
            <input placeholder="Alex Johnson" value={form.name} onChange={set('name')} required autoComplete="name" />
          </div>
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="alex@email.com" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required autoComplete="new-password" />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
          </div>

          <button type="submit" className="btn btn-dark btn-full btn-lg" disabled={loading} style={{ marginTop: '.4rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--t3)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700 }}>Sign In</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

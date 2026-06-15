/**
 * Renders the password reset request form that emails a secure reset link via the auth API. Shows a confirmation message after the reset email is sent.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../lib/api';

export default function ResetPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.resetRequest(email, 'email');
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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

      <main style={{ maxWidth: 480, margin: '3.5rem auto', padding: '0 1.25rem 4rem' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '.6rem' }}>Check Your Email</h1>
            <p style={{ color: 'var(--t3)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              We sent a reset link to <strong style={{ color: 'var(--t1)' }}>{email}</strong>. It expires in 15 minutes.
            </p>
            <Link to="/login" className="btn btn-gold btn-lg">Back to Login</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2.1rem', marginBottom: '.45rem' }}>Reset Password</h1>
            <p style={{ color: 'var(--t3)', marginBottom: '2rem', lineHeight: 1.55 }}>
              Enter your email and we'll send a secure link.
            </p>

            {error && (
              <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <button type="submit" className="btn btn-gold btn-full btn-lg" disabled={loading} style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--t3)' }}>
                <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 700 }}>Back to Login</Link>
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

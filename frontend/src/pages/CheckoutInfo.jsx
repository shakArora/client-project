import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CheckoutStepper from '../components/CheckoutStepper';
import { orderApi } from '../lib/api';

const NAV = [{ label: 'Shop', to: '/shop' }, { label: 'About', to: '/about' }];

export default function CheckoutInfo() {
  const navigate = useNavigate();
  const cart = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', comments: '',
    referralCode: cart.refCode || '',
  });
  const [validating, setValidating] = useState(false);
  const [addrError, setAddrError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const pillLabel = cart.fundraiserTitle || 'Community Fundraiser';

  async function handleNext(e) {
    e.preventDefault();
    setAddrError('');
    setValidating(true);
    try {
      await orderApi.validateAddress(form.address.trim());
    } catch (err) {
      setAddrError(err.response?.data?.message || 'We could not verify that address. Please check spelling and try again.');
      setValidating(false);
      return;
    }
    setValidating(false);
    const saved = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
    sessionStorage.setItem('routed_cart', JSON.stringify({ ...saved, customerInfo: form }));
    navigate('/shop/pay');
  }

  return (
    <div className="page checkout-page">
      <Navbar links={NAV} actionLabel="Log In" actionTo="/login" />

      <main className="checkout-main">
        <span className="title-pill">{pillLabel}</span>
        <CheckoutStepper step={2} />
        <h1 className="checkout-title">Your Details</h1>

        {cart.fundraiserDescription && (
          <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '.95rem' }}>{cart.fundraiserDescription}</p>
        )}
        {cart.deliveryNotes && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1.25rem', fontSize: '.9rem', color: '#1e3a5f', lineHeight: 1.5 }}>
            <strong>Delivery information:</strong> {cart.deliveryNotes}
          </div>
        )}

        <form id="checkout-info-form" onSubmit={handleNext} className="checkout-form">
          <div className="field">
            <label>Full Name</label>
            <input placeholder="Enter your name" value={form.name} onChange={set('name')} required autoComplete="name" />
          </div>
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="Enter your email" value={form.email} onChange={set('email')} required autoComplete="email" inputMode="email" />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />
          </div>
          <div className="field">
            <label>Delivery Address</label>
            <input placeholder="123 Main St, Springfield, IL 62701" value={form.address} onChange={set('address')} required autoComplete="street-address" />
            {addrError && <p style={{ color: 'var(--red)', fontSize: '.85rem', marginTop: '.4rem', fontWeight: 600 }}>{addrError}</p>}
            <p style={{ color: 'var(--t3)', fontSize: '.8rem', marginTop: '.35rem' }}>We verify your address before saving. Invalid addresses cannot be used for delivery.</p>
          </div>
          <div className="field">
            <label>Comments (Optional)</label>
            <textarea placeholder="Leave at the side gate…" rows={3} value={form.comments} onChange={set('comments')} style={{ resize: 'vertical' }} />
          </div>
          {cart.refCode && (
            <div className="field">
              <label>Referral Code</label>
              <input value={form.referralCode} readOnly style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-dk)', fontWeight: 700 }} />
            </div>
          )}

          <div className="checkout-actions checkout-actions--inline">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-outline btn-lg">← Back</button>
            <button type="submit" className="btn btn-gold btn-lg" disabled={validating}>{validating ? 'Checking address…' : 'Next →'}</button>
          </div>
        </form>
      </main>

      <div className="checkout-actions-sticky">
        <div className="checkout-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-outline btn-lg">← Back</button>
          <button type="submit" form="checkout-info-form" className="btn btn-gold btn-lg" disabled={validating}>{validating ? 'Checking…' : 'Next →'}</button>
        </div>
      </div>
    </div>
  );
}

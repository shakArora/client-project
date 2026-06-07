import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'Shop', to: '/shop' }];

function Stepper({ step }) {
  return (
    <div className="stepper" style={{ margin: '1.1rem 0' }}>
      <div className={`stepper-step ${step > 1 ? 'done' : step === 1 ? 'active' : ''}`}>{step > 1 ? '✓' : '1'}</div>
      <div className={`stepper-line ${step > 1 ? 'done' : ''}`} />
      <div className={`stepper-step ${step > 2 ? 'done' : step === 2 ? 'active' : ''}`}>{step > 2 ? '✓' : '2'}</div>
      <div className={`stepper-line ${step > 2 ? 'done' : ''}`} />
      <div className={`stepper-step ${step === 3 ? 'active' : ''}`}>3</div>
    </div>
  );
}

export default function CheckoutInfo() {
  const navigate = useNavigate();
  const cart     = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
  const [form, setForm] = useState({ name: '', email: '', address: '', comments: '', referralCode: cart.refCode || '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleNext(e) {
    e.preventDefault();
    const cart = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
    sessionStorage.setItem('routed_cart', JSON.stringify({ ...cart, customerInfo: form }));
    navigate('/shop/pay');
  }

  return (
    <div className="page">
      <Navbar links={NAV} />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.8rem 1.25rem 4rem' }}>
        <span className="title-pill">Community Fundraiser</span>
        <Stepper step={2} />
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '.5rem 0 1.6rem' }}>Your Details</h1>

        <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="field">
            <label>Full Name</label>
            <input placeholder="Sarah Mitchell" value={form.name} onChange={set('name')} required autoComplete="name" />
          </div>
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="sarah@email.com" value={form.email} onChange={set('email')} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Delivery Address</label>
            <input placeholder="14 Oak Lane, Springfield, IL 62701" value={form.address} onChange={set('address')} required autoComplete="street-address" />
          </div>
          <div className="field">
            <label>Comments (Optional)</label>
            <textarea placeholder="Leave at the side gate…" rows={3} value={form.comments} onChange={set('comments')} style={{ resize: 'vertical' }} />
          </div>
          <div className="field">
            <label>Vendor Referral Code (Optional)</label>
            <input placeholder="e.g. AJ47" value={form.referralCode} onChange={set('referralCode')} style={{ textTransform: 'uppercase', letterSpacing: '.08em' }} maxLength={6} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '.5rem' }}>
            <Link to="/shop" className="btn btn-outline btn-lg" style={{ flex: 1 }}>← Back</Link>
            <button type="submit" className="btn btn-gold btn-lg" style={{ flex: 1 }}>Next →</button>
          </div>
        </form>
      </main>
    </div>
  );
}

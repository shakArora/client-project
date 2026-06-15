/**
 * Second checkout step where customers enter contact info, validated delivery address, and optional referral code.
 * Persists cart customer details in sessionStorage and advances the three-step checkout flow toward payment.
 * @author Shivum Arora
 * @date 6/11/2026
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CheckoutStepper from '../components/CheckoutStepper';
import AddressSelect from '../components/AddressSelect';

const NAV = [{ label: 'Shop', to: '/shop' }, { label: 'About', to: '/about' }];

export default function CheckoutInfo() {
  const navigate = useNavigate();
  const cart = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
  const saved = cart.customerInfo || {};
  const [form, setForm] = useState({
    name: saved.name || '',
    email: saved.email || '',
    phone: saved.phone || '',
    address: saved.address || '',
    addressCoords: saved.addressCoords || null,
    comments: saved.comments || '',
    referralCode: cart.refCode || saved.referralCode || '',
  });
  const [validating, setValidating] = useState(false);
  const [addrError, setAddrError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const pillLabel = cart.fundraiserTitle || 'Community Fundraiser';

  async function handleNext(e) {
    e.preventDefault();
    setAddrError('');
    if (!form.addressCoords?.lat) {
      setAddrError('Please select a valid delivery address from the dropdown.');
      return;
    }
    setValidating(true);
    const cartNow = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
    sessionStorage.setItem('routed_cart', JSON.stringify({
      ...cartNow,
      customerInfo: { ...form, address: form.addressCoords.display || form.address },
    }));
    setValidating(false);
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

          <AddressSelect
            label="Delivery Address"
            value={form.address}
            coords={form.addressCoords}
            required
            placeholder="123 Main St, Springfield, IL"
            hint="Start typing, then pick your address from the list. We only deliver to verified addresses."
            onChange={({ address, coords }) => {
              setForm(f => ({ ...f, address, addressCoords: coords }));
              setAddrError('');
            }}
          />
          {addrError && <p style={{ color: 'var(--red)', fontSize: '.85rem', marginTop: '-.5rem', marginBottom: '1rem', fontWeight: 600 }}>{addrError}</p>}

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
            <button type="submit" className="btn btn-gold btn-lg" disabled={validating}>{validating ? 'Saving…' : 'Next →'}</button>
          </div>
        </form>
      </main>

      <div className="checkout-actions-sticky">
        <div className="checkout-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-outline btn-lg">← Back</button>
          <button type="submit" form="checkout-info-form" className="btn btn-gold btn-lg" disabled={validating}>{validating ? 'Saving…' : 'Next →'}</button>
        </div>
      </div>
    </div>
  );
}

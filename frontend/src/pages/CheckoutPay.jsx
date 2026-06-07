import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { orderApi } from '../lib/api';

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

export default function CheckoutPay() {
  const navigate = useNavigate();
  const cart = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
  const info = cart.customerInfo || {};

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function placeOrder() {
    setError(''); setLoading(true);
    try {
      const payload = {
        fundraiserId:    cart.fundraiserId,
        referralCode:    info.referralCode || undefined,
        customerName:    info.name,
        customerEmail:   info.email,
        deliveryAddress: info.address,
        comments:        info.comments || undefined,
        items:           cart.items,
      };
      const { data } = await orderApi.place(payload);
      sessionStorage.setItem('routed_order', JSON.stringify(data));
      sessionStorage.removeItem('routed_cart');
      navigate('/shop/confirmation');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Navbar links={NAV} />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '1.8rem 1.25rem 4rem' }}>
        <span className="title-pill">Community Fundraiser</span>
        <Stepper step={3} />
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.7rem,4vw,2.4rem)', margin: '.5rem 0 1.6rem' }}>Review &amp; Pay</h1>

        {error && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left – review info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div className="field"><label>Full Name</label><input readOnly value={info.name || ''} /></div>
              <div className="field"><label>Email</label><input readOnly value={info.email || ''} /></div>
            </div>
            <div className="field"><label>Delivery Address</label><input readOnly value={info.address || ''} /></div>
            {info.comments && <div className="field"><label>Comments</label><textarea readOnly value={info.comments} rows={2} /></div>}
            {info.referralCode && <div className="field"><label>Referral Code</label><input readOnly value={info.referralCode} /></div>}

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '1.2rem', textAlign: 'center', color: 'var(--t3)', fontSize: '.92rem' }}>
              <p style={{ fontWeight: 700, marginBottom: '.35rem' }}>Payment</p>
              PayPal / Stripe integration goes here
            </div>
          </div>

          {/* Right – order summary */}
          <div className="card">
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem' }}>Order Summary</h3>
            {(cart.items || []).map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.65rem', fontSize: '.9rem', color: 'var(--t2)' }}>
                <span>{item.productName} × {item.quantity}</span>
                <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: '.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', marginBottom: '1.2rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--gold-dk)' }}>${(cart.totalAmount || 0).toFixed(2)}</span>
            </div>

            <button onClick={placeOrder} disabled={loading} className="btn btn-dark btn-full btn-lg" style={{ textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.6rem' }}>
              {loading ? 'Placing Order…' : 'Place Order'}
            </button>
            <Link to="/shop/info" className="btn btn-outline btn-full">← Back</Link>
          </div>
        </div>
      </main>

      <style>{`@media(max-width:768px){div[style*="1.4fr 1fr"]{grid-template-columns:1fr!important}div[style*="1fr 1fr"]{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

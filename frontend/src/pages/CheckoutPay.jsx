/**
 * Renders checkout step three with order summary and payment instructions from the fundraiser. Submits the order to the API and navigates to confirmation on success.
 * @name Shivum Arora
 * @date 2026-06-15
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CheckoutStepper from '../components/CheckoutStepper';
import { orderApi } from '../lib/api';

const NAV = [{ label: 'Shop', to: '/shop' }, { label: 'About', to: '/about' }];

function SummaryRow({ label, value, gold }) {
  return (
    <div className="checkout-row">
      <span style={{ color: 'var(--t2)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: gold ? 'var(--gold-dk)' : 'var(--t1)' }}>{value}</span>
    </div>
  );
}

export default function CheckoutPay() {
  const navigate = useNavigate();
  const cart = JSON.parse(sessionStorage.getItem('routed_cart') || '{}');
  const info = cart.customerInfo || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = (cart.items || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const pillLabel = cart.fundraiserTitle || 'Community Fundraiser';

  async function placeOrder(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await orderApi.place({
        fundraiserId: cart.fundraiserId,
        referralCode: info.referralCode || undefined,
        customerName: info.name,
        customerEmail: info.email?.trim() || undefined,
        customerPhone: info.phone || undefined,
        deliveryAddress: info.address,
        comments: info.comments || undefined,
        items: cart.items,
      });
      sessionStorage.setItem('routed_order', JSON.stringify({
        ...data,
        paymentMethod: cart.paymentMethod,
        paymentDestination: cart.paymentDestination,
        paymentNotes: cart.paymentNotes,
      }));
      sessionStorage.removeItem('routed_cart');
      navigate('/shop/confirmation');
    } catch (err) {
      if (!err.response) {
        setError('Network error, check your connection and try again.');
      } else if (err.response?.status >= 500) {
        setError('Server error, please try again in a moment.');
      } else {
        setError(err.response?.data?.message || 'Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const orderSummary = (
    <div className="checkout-summary">
      <p className="checkout-summary-label">Order Summary</p>
      {(cart.items || []).map((item, i) => (
        <SummaryRow key={i} label={`${item.productName} × ${item.quantity}`} value={`$${(item.quantity * item.unitPrice).toFixed(2)}`} />
      ))}
      <SummaryRow label="Delivery Fee" value="$0.00" />
      <div className="checkout-total">
        <span>Total</span>
        <span style={{ color: 'var(--gold-dk)' }}>${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );

  return (
    <div className="page checkout-page">
      <Navbar links={NAV} actionLabel="Log In" actionTo="/login" />

      <main className="checkout-main checkout-main--wide">
        <span className="title-pill">{pillLabel}</span>
        <CheckoutStepper step={3} />
        <h1 className="checkout-title">Review &amp; Pay</h1>

        {cart.fundraiserDescription && (
          <p style={{ color: 'var(--t2)', lineHeight: 1.6, marginBottom: '1rem', fontSize: '.95rem' }}>{cart.fundraiserDescription}</p>
        )}
        {cart.deliveryNotes && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1.25rem', fontSize: '.9rem', color: '#1e3a5f', lineHeight: 1.5 }}>
            <strong>Delivery information:</strong> {cart.deliveryNotes}
          </div>
        )}

        {error && <div className="checkout-error">{error}</div>}

        <div className="checkout-pay-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="checkout-summary hide-mobile" style={{ marginBottom: 0 }}>
              <p className="checkout-summary-label">Delivery To</p>
              <SummaryRow label="Name" value={info.name || ' - '} />
              <SummaryRow label="Email" value={info.email || ' - '} />
              {info.phone && <SummaryRow label="Phone" value={info.phone} />}
              <SummaryRow label="Address" value={info.address || ' - '} />
            </div>

            <div className="checkout-summary">
              <p className="checkout-summary-label">Payment</p>
              {cart.paymentMethod && cart.paymentDestination ? (
                <div style={{ padding: '.5rem 0' }}>
                  <SummaryRow label="Method" value={cart.paymentMethod} />
                  <SummaryRow label="Send to" value={cart.paymentDestination} gold />
                  {cart.paymentNotes && (
                    <p style={{ fontSize: '.85rem', color: 'var(--t2)', lineHeight: 1.5, marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border-lt)' }}>
                      {cart.paymentNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--t3)', fontSize: '.9rem', padding: '1rem 0', lineHeight: 1.5 }}>
                  Payment details will be provided by your troop organizer.
                </p>
              )}
            </div>

            <div className="checkout-actions checkout-actions--inline hide-mobile" style={{ flexDirection: 'column' }}>
              <button onClick={placeOrder} disabled={loading} className="btn btn-dark btn-full btn-lg">
                {loading ? 'Placing…' : 'Place Order'}
              </button>
              <button type="button" onClick={() => navigate('/shop/info')} className="btn btn-outline btn-full">
                ← Back
              </button>
            </div>
          </div>

          <div className="checkout-pay-sidebar">
            {orderSummary}
          </div>
        </div>
      </main>

      <div className="checkout-actions-sticky">
        <div style={{ marginBottom: '.5rem', fontSize: '.82rem', color: 'var(--t3)', textAlign: 'center' }}>
          Total: <strong style={{ color: 'var(--gold-dk)' }}>${subtotal.toFixed(2)}</strong>
        </div>
        <div className="checkout-actions">
          <button type="button" onClick={() => navigate('/shop/info')} className="btn btn-outline btn-lg">← Back</button>
          <button onClick={placeOrder} disabled={loading} className="btn btn-dark btn-lg">
            {loading ? 'Placing…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

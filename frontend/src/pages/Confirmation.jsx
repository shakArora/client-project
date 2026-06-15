import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'Shop', to: '/shop' }, { label: 'About', to: '/about' }];

export default function Confirmation() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('routed_order');
    if (saved) setOrder(JSON.parse(saved));
  }, []);

  const firstName = order?.customerName?.split(' ')[0] || '';
  const orderCode = order ? `#${(order._id || '').slice(-8).toUpperCase()}` : ' - ';
  const itemSummary = order
    ? (order.items || []).map(i => `${i.productName} × ${i.quantity}`).join(', ')
    : ' - ';

  const deliveryDate = order?.fundraiserId?.deliveryDate
    ? new Date(order.fundraiserId.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="page checkout-page">
      <Navbar links={NAV} actionLabel="Log In" actionTo="/login" />

      <main className="checkout-main" style={{ textAlign: 'center', paddingTop: '2rem' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(78,109,56,.25)',
        }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="checkout-title" style={{ marginBottom: '.65rem' }}>Order Placed!</h1>

        <p style={{ color: 'var(--t3)', lineHeight: 1.65, marginBottom: '1.75rem', fontSize: '.95rem' }}>
          {firstName && <>Thank you, <strong style={{ color: 'var(--t1)' }}>{firstName}</strong>! </>}
          {order?.customerEmail
            ? <>A confirmation email has been sent to <strong style={{ color: 'var(--t1)' }}>{order.customerEmail}</strong>.</>
            : 'Your order has been received.'}
        </p>

        {order?.paymentMethod && order?.paymentDestination && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1rem 1.15rem', marginBottom: '1.25rem', textAlign: 'left' }}>
            <p style={{ fontSize: '.72rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Send payment to</p>
            <p style={{ fontWeight: 700, color: '#78350f', marginBottom: '.2rem' }}>{order.paymentMethod}: {order.paymentDestination}</p>
            {order.paymentNotes && <p style={{ fontSize: '.88rem', color: '#92400e', lineHeight: 1.5 }}>{order.paymentNotes}</p>}
          </div>
        )}

        {order && (
          <div className="checkout-summary" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            {[
              { label: 'Order #', value: orderCode },
              { label: 'Items', value: itemSummary },
              { label: 'Total Paid', value: `$${(order.totalAmount || 0).toFixed(2)}`, gold: true },
              deliveryDate && { label: 'Est. Delivery', value: deliveryDate },
            ].filter(Boolean).map(({ label, value, gold }) => (
              <div key={label} className="checkout-row">
                <span style={{ color: 'var(--t3)' }}>{label}</span>
                <span style={{ fontWeight: 700, color: gold ? 'var(--gold-dk)' : 'var(--t1)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/shop')} className="btn btn-gold btn-full btn-lg">
          Shop More
        </button>
      </main>
    </div>
  );
}

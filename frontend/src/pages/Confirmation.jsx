import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NAV = [{ label: 'Shop', to: '/shop' }];

export default function Confirmation() {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('routed_order');
    if (saved) setOrder(JSON.parse(saved));
  }, []);

  return (
    <div className="page">
      <Navbar links={NAV} />
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '3rem 1.25rem 4rem', textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#4E6D38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', color: '#fff', margin: '0 auto 1.4rem' }}>✓</div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,2.8rem)', marginBottom: '.65rem' }}>Order Placed!</h1>

        <p style={{ color: 'var(--t3)', lineHeight: 1.6, marginBottom: '1.8rem', fontSize: '.97rem' }}>
          {order
            ? <>Thank you, <strong style={{ color: 'var(--t1)' }}>{order.customerName}</strong>! A confirmation has been sent to <strong style={{ color: 'var(--t1)' }}>{order.customerEmail}</strong>.</>
            : 'Your order has been received. Check your email for confirmation.'}
        </p>

        {order && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', padding: '1.1rem 1.3rem', marginBottom: '1.6rem', textAlign: 'left' }}>
            {[
              { label: 'Order #',    value: order._id?.slice(-6).toUpperCase() || '—' },
              { label: 'Items',      value: `${order.totalBags} bag${order.totalBags !== 1 ? 's' : ''}` },
              { label: 'Total Paid', value: `$${order.totalAmount?.toFixed(2) || '0.00'}`, gold: true },
              { label: 'Delivery',   value: order.deliveryAddress || '—' },
            ].map(({ label, value, gold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.55rem 0', borderBottom: '1px solid var(--border-lt)' }}>
                <span style={{ color: 'var(--t3)', fontSize: '.9rem' }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: '.9rem', color: gold ? 'var(--gold-dk)' : 'var(--t1)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/shop" className="btn btn-gold btn-full btn-lg" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Shop More</Link>
      </main>
    </div>
  );
}

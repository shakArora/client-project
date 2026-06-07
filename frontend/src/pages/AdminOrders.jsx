import { useState, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { orderApi } from '../lib/api';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';

const STATUS_OPTIONS = ['pending', 'paid', 'fulfilled', 'delivered', 'cancelled'];
const STATUS_STYLE   = {
  pending:   { bg: '#FFF3E0', color: '#E65100' },
  paid:      { bg: 'var(--green-bg)', color: 'var(--green)' },
  fulfilled: { bg: '#E3F2FD', color: '#1565C0' },
  delivered: { bg: '#E8F5E9', color: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', color: '#C62828' },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { bg: 'var(--surface-2)', color: 'var(--t3)' };
  return <span style={{ background: s.bg, color: s.color, borderRadius: 'var(--rpill)', padding: '.2rem .6rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{status}</span>;
}

function OrderModal({ order, onClose, onStatusUpdate }) {
  const [status,  setStatus]  = useState(order.status);
  const [saving,  setSaving]  = useState(false);

  async function handleUpdate() {
    setSaving(true);
    try {
      const { data } = await orderApi.updateStatus(order._id, status);
      onStatusUpdate(data);
      onClose();
    } catch {} finally { setSaving(false); }
  }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFDF6', borderRadius: 'var(--r4)', padding: '1.8rem', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: '.25rem' }}>Order #{order._id.slice(-6).toUpperCase()}</h2>
                <p style={{ color: 'var(--t3)', fontSize: '.83rem' }}>{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--t3)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--r3)', padding: '.9rem' }}>
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: '.4rem' }}>Customer</p>
                <p style={{ fontWeight: 700, marginBottom: '.15rem' }}>{order.customerName}</p>
                <p style={{ color: 'var(--t3)', fontSize: '.83rem' }}>{order.customerEmail}</p>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--r3)', padding: '.9rem' }}>
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: '.4rem' }}>Delivery Address</p>
                <p style={{ fontWeight: 600, fontSize: '.88rem', lineHeight: 1.5 }}>{order.deliveryAddress}</p>
              </div>
            </div>

        {/* Items */}
        <div style={{ marginBottom: '1.2rem' }}>
          <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: '.5rem' }}>Items</p>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0', borderBottom: '1px solid var(--border-lt)', fontSize: '.9rem' }}>
              <span>{item.productName || item.name} × {item.quantity}</span>
              <span style={{ fontWeight: 700 }}>${((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', paddingTop: '.6rem', color: 'var(--gold-dk)' }}>
            <span>Total</span>
            <span>${(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        {order.comments && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r2)', padding: '.75rem', fontSize: '.85rem', color: 'var(--t2)', marginBottom: '1.2rem' }}>
            <strong>Note:</strong> {order.comments}
          </div>
        )}

        {/* Status update */}
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r2)', padding: '.5rem .8rem', fontFamily: 'var(--sans)', fontSize: '.87rem', background: '#FFFDF6' }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn btn-dark btn-sm" onClick={handleUpdate} disabled={saving || status === order.status}>
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const { fundraiser } = useActiveFundraiser();

  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null);

  function loadOrders() {
    setLoading(true);
    orderApi.list(fundraiser?._id ? { fundraiserId: fundraiser._id } : {})
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOrders(); }, [fundraiser?._id]);

  function handleStatusUpdate(updatedOrder) {
    setOrders(ords => ords.map(o => o._id === updatedOrder._id ? updatedOrder : o));
  }

  function exportCSV() {
    const rows = [['Order ID','Customer','Email','Vendor Code','Bags','Total','Status','Date']];
    orders.forEach(o => rows.push([
      o._id.slice(-6).toUpperCase(), o.customerName, o.customerEmail,
      o.referralCode || '', o.totalBags || '', `$${(o.totalAmount||0).toFixed(2)}`,
      o.status, new Date(o.createdAt).toLocaleDateString()
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const visible = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (!search) return true;
    return o.customerName.toLowerCase().includes(search.toLowerCase()) ||
           o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
           (o.referralCode || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminShell fundraiser={fundraiser}>
      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onStatusUpdate={handleStatusUpdate} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.25rem' }}>Orders</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>{orders.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>↓ CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="Search customer or code…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r3)', background: '#FFFDF6', padding: '.6rem .9rem', fontSize: '.88rem', minWidth: 220 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r3)', background: '#FFFDF6', padding: '.6rem .9rem', fontFamily: 'var(--sans)', fontSize: '.88rem' }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem' }}>Loading…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Code</th><th>Bags</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--t3)' }}>
                  {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                </td></tr>
              ) : visible.map(o => (
                <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.85rem', color: 'var(--t2)' }}>#{o._id.slice(-6).toUpperCase()}</td>
                  <td>
                    <p style={{ fontWeight: 600, fontSize: '.88rem' }}>{o.customerName}</p>
                    <p style={{ color: 'var(--t3)', fontSize: '.76rem' }}>{o.customerEmail}</p>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--gold-dk)', fontWeight: 700, letterSpacing: '.08em' }}>{o.referralCode || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{o.totalBags}</td>
                  <td style={{ fontWeight: 700 }}>${(o.totalAmount || 0).toFixed(2)}</td>
                  <td><Badge status={o.status} /></td>
                  <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td><span style={{ color: 'var(--gold)', fontSize: '1rem' }}>›</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

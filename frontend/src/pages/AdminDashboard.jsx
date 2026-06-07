import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../components/AdminShell';
import { adminApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';

const STATUS_STYLE = {
  pending:  { bg: 'var(--orange-bg)', c: 'var(--orange)' },
  paid:     { bg: 'var(--green-bg)',  c: 'var(--green)'  },
  refunded: { bg: 'var(--red-bg)',    c: 'var(--red)'    },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { fundraiser } = useActiveFundraiser();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats(fundraiser?._id)
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fundraiser?._id]);

  const name = user?.name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AdminShell fundraiser={fundraiser}>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,3vw,2rem)', marginBottom: '.3rem' }}>
        {greeting}, {name}
      </h1>
      <p style={{ color: 'var(--t3)', marginBottom: '1.6rem', fontSize: '.9rem' }}>
        {stats?.fundraiser?.title || 'Active Fundraiser'}
        {stats?.fundraiser?.endDate ? ` · Ends ${new Date(stats.fundraiser.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : ''}
      </p>

      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
      ) : (
        <>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.85rem', marginBottom: '1.4rem' }}>
            {[
              { label: 'Bags Sold', value: stats?.totalBags    || 0, gold: true },
              { label: 'Revenue',   value: `$${(stats?.totalRevenue || 0).toFixed(2)}`, gold: false },
              { label: 'Vendors',   value: stats?.vendorCount  || 0 },
              { label: 'Orders',    value: stats?.orderCount   || 0 },
            ].map(({ label, value, gold }) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: '1.1rem' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: gold ? 'var(--gold-dk)' : 'var(--t1)', marginBottom: '.3rem' }}>{value}</p>
                <p style={{ color: 'var(--t3)', fontSize: '.82rem', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1rem' }}>
            {/* Recent orders */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1rem' }}>Recent Orders</h3>
                <Link to="/admin/orders" style={{ fontSize: '.8rem', color: 'var(--gold-dk)', fontWeight: 700 }}>View all →</Link>
              </div>
              {(stats?.recentOrders || []).slice(0, 5).map(o => {
                const s = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
                return (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.7rem 0', borderBottom: '1px solid var(--border-lt)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.12rem' }}>{o.customerName}</p>
                      <p style={{ color: 'var(--t3)', fontSize: '.78rem' }}>{o.deliveryAddress} · {o.totalBags} bags</p>
                    </div>
                    <span style={{ background: s.bg, color: s.c, borderRadius: 'var(--rpill)', padding: '.2rem .55rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{o.status}</span>
                  </div>
                );
              })}
              {!stats?.recentOrders?.length && <p style={{ color: 'var(--t3)', fontSize: '.9rem', textAlign: 'center', padding: '1rem 0' }}>No orders yet.</p>}
            </div>

            {/* Top vendors */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1rem' }}>Top Vendors</h3>
                <Link to="/admin/vendors" style={{ fontSize: '.8rem', color: 'var(--gold-dk)', fontWeight: 700 }}>View all →</Link>
              </div>
              {(stats?.topVendors || []).map((v, i) => {
                const max = stats.topVendors[0]?.bagsSold || 1;
                const initials = v.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={v._id} style={{ padding: '.65rem 0', borderBottom: '1px solid var(--border-lt)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.4rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                      <span style={{ fontWeight: 700, fontSize: '.9rem', flex: 1 }}>{v.name}</span>
                      <span style={{ color: 'var(--gold-dk)', fontWeight: 800, fontSize: '.9rem' }}>{v.bagsSold} bags</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(v.bagsSold / max) * 100}%`, background: 'var(--gold)', borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
              {!stats?.topVendors?.length && <p style={{ color: 'var(--t3)', fontSize: '.9rem', textAlign: 'center', padding: '1rem 0' }}>No vendors yet.</p>}
            </div>
          </div>
        </>
      )}

      <style>{`@media(max-width:900px){div[style*="repeat(4,1fr)"]{grid-template-columns:repeat(2,1fr)!important}div[style*="1.1fr 1fr"]{grid-template-columns:1fr!important}}`}</style>
    </AdminShell>
  );
}

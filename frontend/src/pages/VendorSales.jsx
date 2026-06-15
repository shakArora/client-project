import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import VendorNav from '../components/VendorNav';
import AppPage from '../components/AppPage';
import { SkeletonVendorPage } from '../components/Skeleton';

export default function VendorSales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendor,    setVendor]    = useState(null);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalMsg,   setGoalMsg]   = useState('');

  useEffect(() => {
    Promise.all([vendorApi.me(), vendorApi.myOrders()])
      .then(([vr, or]) => {
        setVendor(vr.data);
        setOrders(or.data || []);
        setGoalInput(vr.data?.revenueGoal || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveGoal(e) {
    e.preventDefault();
    setSavingGoal(true); setGoalMsg('');
    try {
      const res = await vendorApi.updateMe({ revenueGoal: Number(goalInput) });
      setVendor(res.data);
      setGoalMsg('Goal saved!');
    } catch {
      setGoalMsg('Failed to save goal.');
    } finally {
      setSavingGoal(false);
    }
  }

  const fundraiser = vendor?.fundraiserId;
  const name = user?.name?.split(' ')[0] || 'Vendor';
  const revenue = vendor?.totalRevenue || 0;
  const goal    = vendor?.revenueGoal  || 0;
  const pct     = goal > 0 ? Math.min(100, Math.round((revenue / goal) * 100)) : 0;

  const endLabel = fundraiser?.endDate
    ? `Ends ${new Date(fundraiser.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : 'Active Fundraiser';
  const seasonLabel = fundraiser?.startDate
    ? new Date(fundraiser.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <AppPage>
      <VendorNav userName={name} />

      <main className="vendor-main" style={{ maxWidth: 720 }}>
        {loading ? (
          <SkeletonVendorPage />
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', marginBottom: '.2rem' }}>
              {fundraiser ? `${fundraiser.title}${seasonLabel ? `, ${seasonLabel}` : ''}` : 'Your Fundraiser'}
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.9rem', marginBottom: '1.4rem' }}>{endLabel}</p>

            {/* Tab bar */}
            <div className="tab-bar" style={{ maxWidth: 440, marginBottom: '1.5rem' }}>
              <button onClick={() => navigate('/vendor/codes')}>My Codes</button>
              <button className="active">My Sales</button>
            </div>

            {/* Stats */}
            <div className="vendor-stats-grid" style={{ marginBottom: '1.1rem' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.2rem,6vw,3rem)', fontWeight: 800, color: 'var(--gold-dk)', lineHeight: 1, marginBottom: '.35rem' }}>
                  {vendor?.bagsSold || 0}
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '.88rem' }}>Bags Sold</p>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2.2rem,6vw,3rem)', fontWeight: 800, color: 'var(--t1)', lineHeight: 1, marginBottom: '.35rem' }}>
                  ${revenue.toFixed(0)}
                </p>
                <p style={{ color: 'var(--t3)', fontSize: '.88rem' }}>Total Sales</p>
              </div>
            </div>

            {/* Revenue Goal */}
            <div className="card" style={{ marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem', flexWrap: 'wrap', gap: '.5rem' }}>
                <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)' }}>Revenue Goal</p>
                {goal > 0 && <span style={{ fontSize: '.82rem', fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--gold-dk)' }}>{pct}% {pct >= 100 ? 'Goal reached' : 'of goal'}</span>}
              </div>
              {goal > 0 && (
                <div style={{ marginBottom: '.75rem' }}>
                  <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: '.35rem' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--gold)', borderRadius: 99, transition: 'width .5s' }} />
                  </div>
                  <p style={{ fontSize: '.8rem', color: 'var(--t3)' }}>${revenue.toFixed(0)} of ${goal.toFixed(0)} goal</p>
                </div>
              )}
              <form onSubmit={saveGoal} style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 'var(--r3)', background: '#FFFDF6', overflow: 'hidden', flex: 1, minWidth: 140 }}>
                  <span style={{ padding: '.65rem .75rem', color: 'var(--t3)', fontWeight: 700 }}>$</span>
                  <input type="number" min="0" step="10" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="Set revenue goal" style={{ border: 'none', outline: 'none', flex: 1, padding: '.65rem .5rem .65rem 0', background: 'transparent', fontSize: '.93rem' }} />
                </div>
                <button type="submit" className="btn btn-gold btn-sm" disabled={savingGoal}>{savingGoal ? 'Saving…' : 'Set Goal'}</button>
              </form>
              {goalMsg && <p style={{ fontSize: '.8rem', marginTop: '.4rem', color: goalMsg.includes('!') ? 'var(--green)' : 'var(--red)' }}>{goalMsg}</p>}
            </div>

            {/* Customer Orders */}
            <div className="card">
              <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '1rem' }}>
                Customer Orders ({orders.length})
              </p>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '1.5rem 0', fontSize: '.92rem' }}>
                  No orders yet, share your link to get started!
                </p>
              ) : (
                <div>
                  {orders.map(o => {
                    const init = (o.customerName || '?').split(' ').map(n => n[0]).slice(0,2).join('');
                    const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <button key={o._id} onClick={() => setSelected(o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.75rem 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border-lt)', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--surface-2)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>
                          {init}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: '.1rem' }}>{o.customerName}</p>
                          <p style={{ color: 'var(--t3)', fontSize: '.8rem' }}>{dateStr} · {o.totalBags} bag{o.totalBags !== 1 ? 's' : ''}</p>
                        </div>
                        <strong style={{ color: 'var(--gold-dk)', fontSize: '.95rem', flexShrink: 0 }}>${(o.totalAmount||0).toFixed(0)}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contacts section */}
            <div className="card" style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, color: 'var(--t3)', marginBottom: '.6rem' }}>Questions? Contact Administrator</p>
              <p style={{ fontSize: '.9rem', color: 'var(--t2)', lineHeight: 1.6 }}>
                {fundraiser?.contactName && <><strong>{fundraiser.contactName}</strong>, </>}
                {fundraiser?.contactPhone && <a href={`tel:${fundraiser.contactPhone}`} style={{ color: 'var(--gold-dk)' }}>{fundraiser.contactPhone}</a>}
                {fundraiser?.contactPhone && fundraiser?.contactEmail && ' · '}
                {fundraiser?.contactEmail && <a href={`mailto:${fundraiser.contactEmail}`} style={{ color: 'var(--gold-dk)' }}>{fundraiser.contactEmail}</a>}
                {!fundraiser?.contactName && !fundraiser?.contactPhone && !fundraiser?.contactEmail && (
                  <a href="mailto:contact.routed@gmail.com" style={{ color: 'var(--gold-dk)' }}>contact.routed@gmail.com</a>
                )}
              </p>
            </div>
          </>
        )}
      </main>

      {/* Order Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--r4)', padding: '2rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: '1.1rem' }}>Order Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem .85rem', marginBottom: '1.1rem' }}>
              {[
                ['Customer', selected.customerName],
                ['Email', selected.customerEmail],
                ['Phone', selected.customerPhone || ' - '],
                ['Date', new Date(selected.createdAt).toLocaleDateString()],
                ['Address', selected.deliveryAddress],
                ['Status', selected.status],
              ].map(([l, v]) => (
                <div key={l} style={{ gridColumn: l === 'Address' ? 'span 2' : undefined }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.15rem' }}>{l}</div>
                  <div style={{ fontSize: '.9rem', fontWeight: 600, wordBreak: 'break-word' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border-lt)', paddingTop: '1rem', marginBottom: '1.1rem' }}>
              {(selected.items || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem', padding: '.3rem 0' }}>
                  <span>{item.productName} × {item.quantity}</span>
                  <strong>${((item.unitPrice || 0) * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '.5rem', paddingTop: '.5rem', borderTop: '2px solid var(--border-lt)' }}>
                <span>Total</span><span style={{ color: 'var(--gold-dk)' }}>${selected.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
            {selected.comments && <p style={{ background: 'var(--surface)', borderRadius: 8, padding: '.65rem .85rem', fontSize: '.85rem', marginBottom: '1rem' }}><strong>Notes:</strong> {selected.comments}</p>}
            <button onClick={() => setSelected(null)} className="btn btn-outline btn-full">Close</button>
          </div>
        </div>
      )}

    </AppPage>
  );
}

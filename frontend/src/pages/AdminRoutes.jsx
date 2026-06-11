import { useState, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { driverApi, orderApi } from '../lib/api';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';
import { 
  geocode, 
  distanceFinder, 
  distMatrix, 
  clusterAddressesWithCapacity, 
  logic 
} from '../../../src/logic.js';

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

const EMPTY_ROUTE = { driverName: '', otp: '' };
const EMPTY_STOP  = { customerName: '', deliveryAddress: '', bags: 1, comment: '' };

export default function AdminRoutes() {
  const { fundraiser } = useActiveFundraiser();

  const [routes,       setRoutes]       = useState([]);
  const [paidOrders,   setPaidOrders]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [routeForm,    setRouteForm]    = useState(EMPTY_ROUTE);
  const [stops,        setStops]        = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [expanded,     setExpanded]     = useState(null);

  const setR = k => e => setRouteForm(f => ({ ...f, [k]: e.target.value }));

  function loadData() {
    setLoading(true);
    const p1 = driverApi.listRoutes().then(r => setRoutes(r.data)).catch(() => {});
    const p2 = fundraiser?._id
      ? orderApi.list({ fundraiserId: fundraiser._id, status: 'paid' }).then(r => setPaidOrders(r.data)).catch(() => {})
      : Promise.resolve();
    Promise.all([p1, p2]).finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [fundraiser?._id]);

  function addStopFromOrder(order) {
    const addr = order.deliveryAddress || {};
    setStops(ss => [...ss, {
      customerName:    order.customerName,
      deliveryAddress: `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`.trim(),
      bags:            order.totalBags || 1,
      comment:         order.comments || '',
      orderId:         order._id,
    }]);
  }

  function addBlankStop() {
    setStops(ss => [...ss, { ...EMPTY_STOP }]);
  }

  function updateStop(i, key, val) {
    setStops(ss => ss.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  function removeStop(i) {
    setStops(ss => ss.filter((_, idx) => idx !== i));
  }

  function genOTP() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRouteForm(f => ({ ...f, otp: code }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!fundraiser?._id) { setError('No active fundraiser.'); return; }
    if (stops.length === 0) { setError('Add at least one stop.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        fundraiserId: fundraiser._id,
        driverName:   routeForm.driverName,
        otp:          routeForm.otp,
        stops:        stops.map(s => ({
          orderId:         s.orderId,
          customerName:    s.customerName,
          deliveryAddress: s.deliveryAddress,
          bags:            Number(s.bags),
          comment:         s.comment || undefined,
        })),
      };
      await driverApi.createRoute(payload);
      setShowForm(false);
      setRouteForm(EMPTY_ROUTE);
      setStops([]);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create route.');
    } finally {
      setSaving(false);
    }
  }

  const progress = (r) => r.totalStops > 0 ? Math.round((r.completedStops / r.totalStops) * 100) : 0;

  return (
    <AdminShell fundraiser={fundraiser}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.25rem' }}>Route Planning</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>{routes.length} driver routes</p>
        </div>
        <button className="btn btn-gold" onClick={() => { setShowForm(s => !s); setError(''); }}>
          {showForm ? 'Cancel' : '+ Create Route'}
        </button>
      </div>

      {/* Create Route Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', padding: '1.4rem', marginBottom: '1.4rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', marginBottom: '.35rem' }}>Create Driver Route</h2>
          <p style={{ color: 'var(--t3)', fontSize: '.87rem', marginBottom: '1.1rem' }}>Add stops from paid orders or enter them manually. Share the OTP code with the driver.</p>
          {error && <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.65rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '.9rem' }}>{error}</div>}
          <form onSubmit={handleSave}>
            {/* Route info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem', marginBottom: '1.2rem' }}>
              <Field label="Driver Name *">
                <input placeholder="Marcus Driver" value={routeForm.driverName} onChange={setR('driverName')} required />
              </Field>
              <div className="field">
                <label>Driver OTP Code *</label>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <input placeholder="123456" value={routeForm.otp} onChange={setR('otp')} required maxLength={8}
                    style={{ fontFamily: 'monospace', letterSpacing: '.15em', fontWeight: 800, fontSize: '1.05rem', flex: 1 }} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={genOTP} style={{ whiteSpace: 'nowrap' }}>Generate</button>
                </div>
              </div>
            </div>

            {/* Add from paid orders */}
            {paidOrders.length > 0 && (
              <div style={{ marginBottom: '1.2rem' }}>
                <p style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)', marginBottom: '.6rem' }}>
                  Add from paid orders ({paidOrders.length} available)
                </p>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {paidOrders.map(o => {
                    const already = stops.some(s => s.orderId === o._id);
                    return (
                      <button key={o._id} type="button"
                        className={already ? 'btn btn-green btn-sm' : 'btn btn-outline btn-sm'}
                        disabled={already}
                        onClick={() => addStopFromOrder(o)}
                        style={{ fontSize: '.78rem' }}>
                        {already ? '✓ ' : '+ '}{o.customerName} ({o.totalBags} bags)
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stops list */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
                <p style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--t3)' }}>
                  Stops ({stops.length})
                </p>
                <button type="button" className="btn btn-outline btn-sm" onClick={addBlankStop}>+ Manual Stop</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {stops.map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg)', borderRadius: 'var(--r3)', padding: '.9rem', border: '1px solid var(--border-lt)', position: 'relative' }}>
                    <button type="button" onClick={() => removeStop(i)}
                      style={{ position: 'absolute', top: '.5rem', right: '.7rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '1rem' }}>✕</button>
                    <p style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: '.5rem' }}>Stop {i + 1}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '.72rem' }}>Customer Name</label>
                        <input value={s.customerName} onChange={e => updateStop(i, 'customerName', e.target.value)} required />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: '.72rem' }}>Bags</label>
                        <input type="number" min={1} value={s.bags} onChange={e => updateStop(i, 'bags', e.target.value)} required />
                      </div>
                      <div className="field" style={{ margin: 0, gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '.72rem' }}>Delivery Address</label>
                        <input value={s.deliveryAddress} onChange={e => updateStop(i, 'deliveryAddress', e.target.value)} required />
                      </div>
                      <div className="field" style={{ margin: 0, gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '.72rem' }}>Note (optional)</label>
                        <input value={s.comment} onChange={e => updateStop(i, 'comment', e.target.value)} placeholder="Leave at back door…" />
                      </div>
                    </div>
                  </div>
                ))}
                {stops.length === 0 && (
                  <p style={{ color: 'var(--t3)', fontSize: '.87rem', textAlign: 'center', padding: '1.5rem', border: '1.5px dashed var(--border)', borderRadius: 'var(--r3)' }}>
                    Add stops from paid orders above, or click "+ Manual Stop"
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Creating…' : 'Create Route'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Routes list */}
      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem' }}>Loading…</p>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--t3)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '.75rem' }}>🗺️</p>
          <p style={{ fontWeight: 700, marginBottom: '.4rem' }}>No routes yet</p>
          <p style={{ fontSize: '.9rem' }}>Create a route, then share the OTP code with your driver.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          {routes.map(r => {
            const pct  = progress(r);
            const done = r.completedAt !== null && r.completedAt !== undefined;
            return (
              <div key={r._id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === r._id ? null : r._id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.2rem' }}>
                      <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem' }}>{r.driverName}</h3>
                      <span style={{ background: done ? 'var(--green-bg)' : r.startedAt ? '#E3F2FD' : 'var(--surface-2)', color: done ? 'var(--green)' : r.startedAt ? '#1565C0' : 'var(--t3)', borderRadius: 'var(--rpill)', padding: '.18rem .55rem', fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {done ? 'Complete' : r.startedAt ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--t3)', fontSize: '.82rem' }}>OTP: <strong style={{ fontFamily: 'monospace', letterSpacing: '.12em', color: 'var(--gold-dk)' }}>{r.otp}</strong></p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{r.completedStops}/{r.totalStops}</p>
                      <p style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Stops</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold-dk)' }}>{pct}%</p>
                      <p style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Done</p>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ background: 'var(--border-lt)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: expanded === r._id ? '1rem' : 0 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--green)' : 'var(--gold)', transition: 'width .3s' }} />
                </div>
                {/* Expanded stops */}
                {expanded === r._id && (
                  <div style={{ marginTop: '.5rem' }}>
                    {(r.stops || []).map((stop, i) => (
                      <div key={i} style={{ display: 'flex', gap: '.85rem', padding: '.7rem 0', borderTop: '1px solid var(--border-lt)', alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: stop.deliveredAt ? 'var(--green)' : 'var(--border)', color: stop.deliveredAt ? '#fff' : 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 800, flexShrink: 0 }}>
                          {stop.deliveredAt ? '✓' : i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.1rem' }}>{stop.customerName}</p>
                          <p style={{ color: 'var(--t3)', fontSize: '.8rem', marginBottom: stop.comment ? '.2rem' : 0 }}>{stop.deliveryAddress} · {stop.bags} bags</p>
                          {stop.comment && <p style={{ color: 'var(--t2)', fontSize: '.78rem', fontStyle: 'italic' }}>{stop.comment}</p>}
                        </div>
                        {stop.deliveredAt && <p style={{ color: 'var(--green)', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Delivered</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

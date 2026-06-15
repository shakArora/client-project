/**
 * Renders the driver's active delivery route with color-coded stop list, map navigation links, and mark-delivered actions. Fetches route data via stored OTP and auto-navigates to completion when finished.
 * @name Shivum Arora
 * @date 2026-06-14
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { driverApi } from '../lib/api';
import AppPage from '../components/AppPage';
import { SkeletonDriverRoute } from '../components/Skeleton';

const STOP_STATUS = {
  delivered: { bg: '#4E6D38', color: '#fff', label: '✓', ring: '#4E6D38' },
  current:   { bg: '#C9A862', color: '#fff', label: '▶',  ring: '#C9A862' },
  pending:   { bg: '#fff',    color: '#BF3535', label: '●', ring: '#D0BC98' },
};

export default function DriverRoute() {
  const navigate = useNavigate();
  const otp = localStorage.getItem('routed_driver_otp');

  const [route,   setRoute]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!otp) { navigate('/driver'); return; }
    driverApi.getRoute(otp)
      .then(r => setRoute(r.data))
      .catch(() => setError('Could not load route. Check your code or try refreshing.'))
      .finally(() => setLoading(false));
  }, [otp]);

  async function markComplete(idx) {
    setMarking(idx);
    setError('');
    try {
      const { data } = await driverApi.completeStop(otp, idx);
      setRoute(data);
      if (data.completedAt) navigate('/driver/complete');
    } catch {
      setError('Could not mark stop as delivered. Check your connection and try again.');
    } finally {
      setMarking(null);
    }
  }

  if (loading) return <SkeletonDriverRoute />;

  const stops     = route?.stops || [];
  const currentIdx = stops.findIndex(s => s.status !== 'delivered');
  const progress   = route?.progress || 0;
  const done       = route?.completedStops || 0;
  const total      = stops.length;

  return (
    <AppPage style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar" style={{ borderBottom: '2px solid var(--border-lt)' }}>
        <Link to="/" className="navbar-brand">Routed<span>.</span></Link>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--t2)', lineHeight: 1.2 }}>{route?.driverName || 'Driver'}</p>
          <p style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{done}/{total} stops complete</p>
        </div>
        <span style={{ background: done === total && total > 0 ? 'var(--green-bg)' : 'var(--surface-2)', color: done === total && total > 0 ? 'var(--green)' : 'var(--t3)', borderRadius: 'var(--rpill)', padding: '.3rem .8rem', fontSize: '.78rem', fontWeight: 700 }}>
          {done === total && total > 0 ? '✓ Complete' : `${total} Stops`}
        </span>
      </nav>

      <main style={{ maxWidth: 660, margin: '0 auto', padding: '1.5rem 1.25rem 5rem', width: '100%' }}>
        {error && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.8rem 1rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.7rem' }}>My Route</h1>
          <span style={{ fontSize: '.88rem', color: 'var(--t3)', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--gold),var(--green))', borderRadius: 99, transition: 'width .5s' }} />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { color: '#BF3535', label: 'Pending' },
            { color: '#C9A862', label: 'Current stop' },
            { color: '#4E6D38', label: 'Delivered' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.78rem', color: 'var(--t3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </div>
          ))}
        </div>

        {/* Stop list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {stops.map((stop, i) => {
            const isDelivered = stop.status === 'delivered';
            const isCurrent   = i === currentIdx;
            const statusKey   = isDelivered ? 'delivered' : isCurrent ? 'current' : 'pending';
            const st          = STOP_STATUS[statusKey];

            return (
              <div key={i} style={{
                background: isCurrent ? '#fff' : isDelivered ? 'rgba(78,109,56,.05)' : 'var(--surface)',
                border: isCurrent ? '2px solid var(--gold)' : isDelivered ? '1px solid rgba(78,109,56,.2)' : '1px solid var(--border-lt)',
                borderRadius: 'var(--r3)',
                padding: '1rem 1.1rem',
                transition: 'all .2s',
              }}>
                <div style={{ display: 'flex', gap: '.85rem' }}>
                  {/* Colored status dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: st.bg, color: st.color,
                      border: `2px solid ${st.ring}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.75rem', fontWeight: 800,
                    }}>
                      {isDelivered ? '✓' : i + 1}
                    </div>
                    {i < stops.length - 1 && (
                      <div style={{ width: 2, height: 16, background: isDelivered ? 'var(--green)' : 'var(--border-lt)', borderRadius: 99 }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '.95rem', color: isDelivered ? 'var(--t3)' : 'var(--t1)', textDecoration: isDelivered ? 'line-through' : 'none' }}>
                        {stop.customerName}
                      </p>
                      <span style={{ fontSize: '.82rem', fontWeight: 700, color: isCurrent ? 'var(--gold-dk)' : 'var(--t3)', flexShrink: 0 }}>
                        {stop.bags} bag{stop.bags !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p style={{ color: 'var(--t3)', fontSize: '.83rem', marginTop: '.12rem' }}>{stop.deliveryAddress}</p>
                    {stop.comment && (
                      <p style={{ color: 'var(--t2)', fontSize: '.82rem', marginTop: '.3rem', fontStyle: 'italic' }}>
                        "{stop.comment}"
                      </p>
                    )}
                    {isDelivered && stop.deliveredAt && (
                      <p style={{ color: 'var(--green)', fontSize: '.78rem', marginTop: '.25rem', fontWeight: 600 }}>
                        ✓ Delivered at {new Date(stop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons for current stop */}
                {isCurrent && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(stop.deliveryAddress)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Google Maps</a>
                    <a href={`maps://maps.apple.com/?q=${encodeURIComponent(stop.deliveryAddress)}`} className="btn btn-outline btn-sm">🍎 Apple Maps</a>
                    <a href={`https://waze.com/ul?q=${encodeURIComponent(stop.deliveryAddress)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">📡 Waze</a>
                  </div>
                )}
              </div>
            );
          })}

          {stops.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--t3)' }}>
              <p style={{ fontWeight: 700, marginBottom: '.75rem' }}>No stops on this route yet.</p>
              <p>No stops assigned yet. Check back once routes are generated.</p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky "Mark Complete" bar */}
      {currentIdx >= 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '2px solid var(--border-lt)', padding: '1rem 1.25rem', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: '.1rem' }}>Current stop</p>
            <p style={{ fontWeight: 700, fontSize: '.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stops[currentIdx]?.customerName}</p>
          </div>
          <button
            onClick={() => markComplete(currentIdx)}
            disabled={marking !== null}
            className="btn btn-green"
            style={{ textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}
          >
            {marking !== null ? 'Saving…' : '✓ Mark Delivered'}
          </button>
        </div>
      )}
    </AppPage>
  );
}

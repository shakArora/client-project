import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { driverApi } from '../lib/api';

export default function DriverRoute() {
  const navigate = useNavigate();
  const otp = localStorage.getItem('routed_driver_otp');

  const [route,   setRoute]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!otp) { navigate('/driver'); return; }
    driverApi.getRoute(otp)
      .then(r => setRoute(r.data))
      .catch(() => setError('Could not load route. Check your code.'))
      .finally(() => setLoading(false));
  }, [otp]);

  async function markComplete(idx) {
    setMarking(true);
    try {
      const { data } = await driverApi.completeStop(otp, idx);
      setRoute(data);
      if (data.completedAt) navigate('/driver/complete');
    } catch {
      setError('Could not mark stop as delivered. Try again.');
    } finally {
      setMarking(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--t3)' }}>Loading route…</p>
    </div>
  );

  const currentIdx = route?.stops?.findIndex(s => s.status === 'pending') ?? -1;
  const progress   = route?.progress || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">Routed<span>.</span></Link>
        <p style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--t2)' }}>
          {route?.driverName || 'Driver'}
        </p>
        <span className="badge badge-live">{route?.stops?.length || 0} Stops</span>
      </nav>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
        {error && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '.85rem' }}>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem' }}>My Route</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.88rem' }}>
            {route?.completedStops || 0} / {route?.stops?.length || 0} delivered
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: '1.3rem' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--green)', borderRadius: 99, transition: 'width .5s' }} />
        </div>

        {/* Stop list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginBottom: '1.3rem' }}>
          {(route?.stops || []).map((stop, i) => {
            const isDelivered = stop.status === 'delivered';
            const isCurrent   = i === currentIdx;

            return (
              <div key={i} style={{
                background: isCurrent ? 'var(--surface)' : 'transparent',
                border: isCurrent ? '1.5px solid var(--gold)' : '1px solid var(--border-lt)',
                borderRadius: 'var(--r3)',
                padding: '.9rem 1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem' }}>
                  {/* Status indicator */}
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: isDelivered ? 'var(--green)' : isCurrent ? 'var(--gold)' : 'var(--surface-2)',
                    border: (!isDelivered && !isCurrent) ? '1.5px solid var(--border)' : 'none',
                    color: (isDelivered || isCurrent) ? '#fff' : 'var(--t3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.72rem', fontWeight: 800,
                  }}>
                    {isDelivered ? '✓' : isCurrent ? '!' : '–'}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 700, fontSize: '.92rem' }}>{stop.customerName}</p>
                      <p style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{stop.bags} bags</p>
                    </div>
                    <p style={{ color: 'var(--t3)', fontSize: '.82rem', marginTop: '.12rem' }}>{stop.deliveryAddress}</p>
                    {stop.comment && isCurrent && (
                      <p style={{ color: 'var(--t2)', fontSize: '.82rem', marginTop: '.25rem', fontStyle: 'italic' }}>"{stop.comment}"</p>
                    )}
                    {isDelivered && (
                      <p style={{ color: 'var(--green)', fontSize: '.78rem', marginTop: '.12rem' }}>
                        Delivered {stop.deliveredAt ? new Date(stop.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    )}
                  </div>
                </div>

                {isCurrent && (
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.85rem', flexWrap: 'wrap' }}>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(stop.deliveryAddress)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Google Maps</a>
                    <a href={`maps://maps.apple.com/?q=${encodeURIComponent(stop.deliveryAddress)}`} className="btn btn-outline btn-sm">Apple Maps</a>
                    <a href={`https://waze.com/ul?q=${encodeURIComponent(stop.deliveryAddress)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Waze</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {currentIdx >= 0 && (
          <button
            onClick={() => markComplete(currentIdx)}
            disabled={marking}
            className="btn btn-green btn-full btn-lg"
            style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}
          >
            {marking ? 'Saving…' : 'Mark Stop Complete ✓'}
          </button>
        )}
      </main>
    </div>
  );
}

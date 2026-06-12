import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fundraiserApi, productApi } from '../lib/api';
import { getSaleStatus, formatLocalDate } from '../lib/dates';

const NAV = [{ label: 'About', to: '/about' }];
const BG_CYCLE = ['#B8914A', '#8B6835', '#5A7A3A', '#7A6A40', '#4A6A35', '#9B7A3A'];

export default function CustomerPage() {
  const { slug }         = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const refCode          = searchParams.get('ref') || '';

  const [fundraiser, setFundraiser] = useState(null);
  const [products,   setProducts]   = useState([]);
  const [qty,        setQty]        = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [slide,      setSlide]      = useState(0);
  const sliderRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const fr = await fundraiserApi.bySlug(slug);
        setFundraiser(fr.data);
        const pr = await productApi.list(fr.data._id);
        const active = (pr.data || []).filter(p => p.isActive);
        setProducts(active);
        const init = {};
        active.forEach(p => { init[p._id] = 0; });
        setQty(init);
      } catch {
        setError('This fundraiser could not be found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const sale = getSaleStatus(fundraiser);
  const isClosed = sale.closed;

  function closedMessage() {
    if (sale.reason === 'draft') return 'This fundraiser is not live yet.';
    if (sale.reason === 'not_started') return `Sales begin on ${formatLocalDate(fundraiser.startDate)}.`;
    if (sale.reason === 'ended') return `The sale ended on ${formatLocalDate(fundraiser.endDate)}.`;
    return 'Ordering is not available right now.';
  }
  const totalBags   = Object.values(qty).reduce((s, n) => s + n, 0);
  const totalAmount = products.reduce((s, p) => s + (qty[p._id] || 0) * p.price, 0);

  function changeQty(id, delta) {
    setQty(q => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }));
  }
  function setDirectQty(id, val) {
    const n = parseInt(val) || 0;
    setQty(q => ({ ...q, [id]: Math.max(0, n) }));
  }

  function handleCheckout() {
    const items = products
      .filter(p => qty[p._id] > 0)
      .map(p => ({ productId: p._id, productName: p.name, quantity: qty[p._id], unitPrice: p.price }));
    sessionStorage.setItem('routed_cart', JSON.stringify({
      items,
      fundraiserId: fundraiser._id,
      fundraiserTitle: fundraiser.title,
      fundraiserDescription: fundraiser.description,
      deliveryNotes: fundraiser.deliveryNotes,
      totalBags,
      totalAmount,
      refCode,
    }));
    navigate('/shop/info');
  }

  function scrollTo(i) {
    setSlide(i);
    if (sliderRef.current) {
      const card = sliderRef.current.children[i];
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // Track swipe position for dots
  function handleScroll() {
    if (!sliderRef.current) return;
    const el = sliderRef.current;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setSlide(idx);
  }

  const pillLabel = fundraiser
    ? [fundraiser.title, fundraiser.location?.city && fundraiser.location?.state ? `${fundraiser.location.city}, ${fundraiser.location.state}` : fundraiser.location?.city || null].filter(Boolean).join(' · ')
    : 'Community Fundraiser';

  if (loading) return (
    <div className="page"><Navbar links={NAV} actionLabel="Log In" actionTo="/login" />
      <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>
    </div>
  );
  if (error)   return (
    <div className="page"><Navbar links={NAV} actionLabel="Log In" actionTo="/login" />
      <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--t3)' }}>{error}</div>
    </div>
  );

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <Navbar links={NAV} actionLabel="Log In" actionTo="/login" />

      {/* ── Closed banner ── */}
      {isClosed && (
        <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '1rem 1.5rem', textAlign: 'center', fontSize: '.95rem', lineHeight: 1.5 }}>
          <strong>Ordering is not available.</strong> {closedMessage()}
        </div>
      )}

      <main className="shop-main shop-main--customer">

        {fundraiser.coverImageUrl && (
          <div className="customer-cover" style={{ marginBottom: '1.25rem', borderRadius: 'var(--r4)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img src={fundraiser.coverImageUrl} alt={`${fundraiser.title} cover`} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Pill + header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
          <div>
            <span className="title-pill" style={{ marginBottom: '.75rem', display: 'inline-flex', maxWidth: '100%' }}>
              {pillLabel}
            </span>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,4vw,2rem)', marginBottom: '.5rem', lineHeight: 1.2 }}>{fundraiser.title}</h1>
            <p style={{ color: 'var(--t2)', lineHeight: 1.7, fontSize: '1rem', maxWidth: 600, marginTop: '.25rem' }}>
              {fundraiser.description || 'Help fund a great cause! Every bag you order makes a difference.'}
            </p>
            {!isClosed && fundraiser.endDate && (
              <p style={{ color: 'var(--t3)', fontSize: '.92rem', marginTop: '.5rem' }}>
                {fundraiser.startDate
                  ? `Sale runs ${formatLocalDate(fundraiser.startDate, { month: 'short', day: 'numeric' })} – ${formatLocalDate(fundraiser.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}.`
                  : `Order by ${formatLocalDate(fundraiser.endDate, { weekday: 'long', month: 'long', day: 'numeric' })}.`}
              </p>
            )}
            <p style={{ color: 'var(--t3)', fontSize: '.88rem', marginTop: '.75rem' }}>
              Choose a product below, type how many bags you need, then tap Next to enter your delivery address.
            </p>
          </div>
          {/* Cart summary pill — desktop only */}
          {totalBags > 0 && (
            <div className="cart-pill-desktop" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '.55rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 700, fontSize: '.9rem', flexShrink: 0 }}>
              🛒 Cart ({totalBags}) · ${totalAmount.toFixed(2)}
            </div>
          )}
        </div>

        {/* ── Products ── */}
        {!isClosed && products.length > 0 && (
          <>
            {/* MOBILE: swipeable single-card view */}
            <div className="mobile-slider-wrap">
              <div ref={sliderRef} onScroll={handleScroll} className="product-slider">
                {products.map((p, i) => (
                  <div key={p._id} className="product-slide">
                    <MobileProductCard p={p} i={i} qty={qty[p._id]||0} onChange={v => setDirectQty(p._id, v)} onDelta={d => changeQty(p._id, d)} />
                  </div>
                ))}
              </div>

              {products.length > 1 && (
                <div className="product-dots">
                  {products.map((_, i) => (
                    <button key={i} type="button" onClick={() => scrollTo(i)} className={`product-dot ${i === slide ? 'active' : ''}`} aria-label={`Product ${i + 1}`} />
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP: grid */}
            <div className="desktop-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {products.map((p, i) => (
                <DesktopProductCard key={p._id} p={p} i={i} qty={qty[p._id]||0} onChange={v => setDirectQty(p._id, v)} onDelta={d => changeQty(p._id, d)} />
              ))}
            </div>

            {/* NEXT button — desktop */}
            <div className="desktop-next" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
              <button onClick={handleCheckout} disabled={totalBags === 0} className="btn btn-dark btn-lg" style={{ textTransform: 'uppercase', letterSpacing: '.06em', opacity: totalBags === 0 ? .4 : 1, minWidth: 220 }}>
                Next: Enter Details →
              </button>
            </div>
          </>
        )}

        {!isClosed && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--t3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <p>Products coming soon — check back shortly!</p>
          </div>
        )}
      </main>

      {!isClosed && totalBags > 0 && (
        <div className="mobile-sticky-bar">
          <div className="mobile-sticky-bar-inner">
            <div className="mobile-sticky-summary">
              <strong>{totalBags} bag{totalBags !== 1 ? 's' : ''} · ${totalAmount.toFixed(2)}</strong>
              <span>Tap Next to enter delivery details</span>
            </div>
            <button onClick={handleCheckout} className="btn btn-dark btn-lg">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Contact footer */}
      {(fundraiser.contactName || fundraiser.contactEmail || fundraiser.contactPhone) && (
        <div style={{ borderTop: '1px solid var(--border-lt)', padding: '1.5rem 1.25rem', textAlign: 'center', fontSize: '.88rem', color: 'var(--t3)' }}>
          Questions? Contact {fundraiser.contactName}{fundraiser.contactPhone ? ` · ${fundraiser.contactPhone}` : ''}{fundraiser.contactEmail ? ` · ${fundraiser.contactEmail}` : ''}
        </div>
      )}

    </div>
  );
}

function MobileProductCard({ p, i, qty, onChange, onDelta }) {
  const bg = p.imageUrl ? null : (BG_CYCLE[i % BG_CYCLE.length]);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', overflow: 'hidden' }}>
      {/* Image / emoji area */}
      <div style={{ height: 180, background: bg || '#e5dcc8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.15))' }}>{p.emoji || '📦'}</span>
        }
      </div>
      {/* Content */}
      <div style={{ padding: '1.1rem 1.25rem 1.4rem' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: '.2rem' }}>{p.name}</h2>
        {p.description && <p style={{ color: 'var(--t3)', fontSize: '.88rem', fontStyle: 'italic', marginBottom: '.85rem' }}>{p.description}</p>}
        <div className="product-card-footer">
          <strong style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--gold-dk)' }}>${p.price.toFixed(2)} <span style={{ fontSize: '.82rem', fontWeight: 400, color: 'var(--t3)' }}>/ bag</span></strong>
          <div className="product-qty-row">
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, color: 'var(--t3)', marginBottom: '.35rem' }}>How many bags?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <button type="button" onClick={() => onDelta(-1)} className="qty-btn qty-btn--minus" aria-label="Decrease quantity">−</button>
              <input type="number" min="0" inputMode="numeric" value={qty} onChange={e => onChange(e.target.value)} className="qty-input" aria-label="Number of bags" />
              <button type="button" onClick={() => onDelta(1)} className="qty-btn qty-btn--plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopProductCard({ p, i, qty, onChange, onDelta }) {
  const bg = BG_CYCLE[i % BG_CYCLE.length];
  const active = qty > 0;
  return (
    <div style={{ background: 'var(--surface)', border: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, outline: active ? 'none' : '1px solid var(--border)', borderRadius: 'var(--r4)', overflow: 'hidden' }}>
      <div style={{ height: 165, background: p.imageUrl ? undefined : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '3.8rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.18))' }}>{p.emoji || '📦'}</span>
        }
      </div>
      <div style={{ padding: '1rem 1.1rem 1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.08rem', marginBottom: '.22rem' }}>{p.name}</h3>
        <p style={{ color: 'var(--t3)', fontSize: '.8rem', marginBottom: '.75rem' }}>{p.description}</p>
        <div className="product-card-footer">
          <strong style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--gold-dk)' }}>${p.price}</strong>
          <div className="product-qty-row">
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: 'var(--t3)', marginBottom: '.25rem' }}>Bags</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <button onClick={() => onDelta(-1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <input type="number" min="0" value={qty} onChange={e => onChange(e.target.value)} aria-label="Number of bags" style={{ width: 44, textAlign: 'center', border: '1.5px solid var(--border)', borderRadius: 8, padding: '.2rem', fontWeight: 700, fontSize: '.95rem', background: '#FFFDF6', outline: 'none' }} />
              <button onClick={() => onDelta(1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--gold)', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

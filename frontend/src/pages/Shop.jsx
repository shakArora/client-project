/**
 * Legacy shop entry page that fetches the active fundraiser and redirects to its canonical /fundraiser/:slug URL. Falls back to demo products if no live fundraiser is found.
 * @name Shivum Arora
 * @date 2026-06-14
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppPage from '../components/AppPage';
import { SkeletonCustomerShop } from '../components/Skeleton';
import { fundraiserApi, productApi } from '../lib/api';

const NAV = [{ label: 'About', to: '/about' }];

const FALLBACK_PRODUCTS = [
  { _id: 'fp1', name: 'Hardwood Mulch',   description: '2 cu ft · Natural brown · Long-lasting', price: 8,  emoji: '🪵', bg: '#B8914A' },
  { _id: 'fp2', name: 'Cedar Mulch',      description: '2 cu ft · Aromatic cedar · Pest-resistant', price: 10, emoji: '🌲', bg: '#8B6835' },
  { _id: 'fp3', name: 'Pine Straw Mulch', description: '1 bale · Lightweight · Acidic soil',        price: 7,  emoji: '🌿', bg: '#5A7A3A' },
];

const BG_CYCLE = ['#B8914A','#8B6835','#5A7A3A','#7A6A40','#4A6A35'];

export default function Shop() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode        = searchParams.get('ref') || '';

  const [fundraiser, setFundraiser] = useState(null);
  const [products,   setProducts]   = useState([]);
  const [qty,        setQty]        = useState({});
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fr = await fundraiserApi.active();
        // Redirect to the canonical customer URL
        if (fr.data?.slug) {
          const ref = refCode ? `?ref=${refCode}` : '';
          navigate(`/fundraiser/${fr.data.slug}${ref}`, { replace: true });
          return;
        }
        setFundraiser(fr.data);
        const pr = await productApi.list(fr.data._id);
        const list = pr.data.length ? pr.data : FALLBACK_PRODUCTS;
        setProducts(list);
        setQty(Object.fromEntries(list.map(p => [p._id, 0])));
      } catch {
        setProducts(FALLBACK_PRODUCTS);
        setQty(Object.fromEntries(FALLBACK_PRODUCTS.map(p => [p._id, 0])));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const change = (id, delta) => setQty(q => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }));
  const totalBags   = products.reduce((s, p) => s + (qty[p._id] || 0), 0);
  const totalAmount = products.reduce((s, p) => s + p.price * (qty[p._id] || 0), 0);

  function goNext() {
    const items = products
      .filter(p => qty[p._id] > 0)
      .map(p => ({ productId: p._id, productName: p.name, quantity: qty[p._id], unitPrice: p.price }));
    sessionStorage.setItem('routed_cart', JSON.stringify({ items, fundraiserId: fundraiser?._id, totalBags, totalAmount, refCode }));
    navigate('/shop/info');
  }

  return (
    <AppPage>
      <Navbar links={NAV} />

      <main className="shop-main">
        {loading ? (
          <SkeletonCustomerShop />
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '.75rem' }}>
              <div>
                <span className="title-pill" style={{ marginBottom: '.75rem', display: 'inline-flex' }}>
                  {fundraiser ? `${fundraiser.location?.city || 'Troop 42'} · ${fundraiser.location?.state || 'Springfield, IL'}.` : 'Community Fundraiser'}
                </span>
                <p style={{ color: 'var(--t3)', marginTop: '.6rem', fontSize: '.93rem' }}>
                  {fundraiser?.description || 'Help your local troop fund their summer adventures! Orders are delivered on fundraiser day.'}
                  {fundraiser?.endDate ? ` Orders close ${new Date(fundraiser.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.` : ''}
                </p>
              </div>
              {totalAmount > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '.55rem .9rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 700, fontSize: '.9rem' }}>
                  {totalBags} bags · ${totalAmount.toFixed(2)}
                </div>
              )}
            </div>

            {/* Product grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {products.map((p, i) => (
                <div key={p._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden' }}>
                  <div style={{ background: p.bg || BG_CYCLE[i % BG_CYCLE.length], height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
                    {p.emoji || '📦'}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '.25rem' }}>{p.name}</h3>
                    <p style={{ color: 'var(--t3)', fontSize: '.82rem', marginBottom: '.8rem' }}>{p.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem' }}>${p.price}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                        <button onClick={() => change(p._id, -1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
                        <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{qty[p._id] || 0}</span>
                        <button onClick={() => change(p._id, 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--gold)', color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={goNext}
                disabled={totalBags === 0}
                className="btn btn-dark btn-lg"
                style={{ textTransform: 'uppercase', letterSpacing: '.06em', opacity: totalBags === 0 ? .45 : 1 }}
              >
                Next: Enter Details →
              </button>
            </div>
          </>
        )}
      </main>

      <style>{`@media(max-width:768px){div[style*="repeat(3,1fr)"]{grid-template-columns:1fr!important}}`}</style>
    </AppPage>
  );
}

import { useState, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { productApi } from '../lib/api';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';

const EMPTY = { name: '', description: '', price: '', emoji: '📦' };
const EMOJIS = ['📦','🪵','🌲','🌿','🍂','🌾','🪴','🌱'];

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export default function AdminProducts() {
  const { fundraiser, loading: frLoading } = useActiveFundraiser();

  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!fundraiser?._id) return;
    setLoading(true);
    productApi.list(fundraiser._id)
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fundraiser?._id]);

  function openCreate() {
    setEditing(null); setForm(EMPTY); setError(''); setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: String(p.price), emoji: p.emoji || '📦' });
    setError(''); setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!fundraiser?._id) return;
    setError(''); setSaving(true);
    const payload = {
      fundraiserId: fundraiser._id,
      name:         form.name,
      description:  form.description || undefined,
      price:        Number(form.price),
      emoji:        form.emoji || undefined,
    };
    try {
      if (editing) {
        const { data } = await productApi.update(editing._id, payload);
        setProducts(ps => ps.map(p => p._id === editing._id ? data : p));
      } else {
        const { data } = await productApi.create(payload);
        setProducts(ps => [...ps, data]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleProduct(p) {
    try {
      const { data } = await productApi.update(p._id, { isActive: !p.isActive });
      setProducts(ps => ps.map(x => x._id === p._id ? data : x));
    } catch {}
  }

  const BG_MAP = { '📦':'#B8914A','🪵':'#8B6835','🌲':'#5A7A3A','🌿':'#4A7A55','🍂':'#A06030','🌾':'#9A8040','🪴':'#6A8840','🌱':'#558845' };

  return (
    <AdminShell fundraiser={fundraiser}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.25rem' }}>Products</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>
            {fundraiser ? fundraiser.title : 'No active fundraiser'}
          </p>
        </div>
        <button className="btn btn-gold" onClick={openCreate} disabled={!fundraiser}>+ Add Product</button>
      </div>

      {!fundraiser && !frLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--t3)' }}>
          <p style={{ fontWeight: 700, marginBottom: '.5rem' }}>No active fundraiser</p>
          <p style={{ fontSize: '.9rem' }}>Create a fundraiser first, then add products to it.</p>
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', padding: '1.3rem', marginBottom: '1.3rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '1rem' }}>
            {editing ? 'Edit Product' : 'Add Product'}
          </h2>
          {error && <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.65rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '.9rem' }}>{error}</div>}
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Product Name *">
                <input placeholder="Hardwood Mulch" value={form.name} onChange={set('name')} required />
              </Field>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Description">
                <input placeholder="2 cu ft · Natural brown · Long-lasting" value={form.description} onChange={set('description')} />
              </Field>
            </div>
            <Field label="Price ($) *">
              <input type="number" min="0" step="0.01" placeholder="8.00" value={form.price} onChange={set('price')} required />
            </Field>
            <div className="field">
              <label>Emoji Icon</label>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {EMOJIS.map(em => (
                  <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    style={{ width: 40, height: 40, borderRadius: 'var(--r2)', border: form.emoji === em ? '2px solid var(--gold)' : '1.5px solid var(--border)', background: form.emoji === em ? 'var(--gold-pale)' : '#fff', fontSize: '1.25rem', cursor: 'pointer' }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          {products.map(p => (
            <div key={p._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden', opacity: p.isActive ? 1 : .55 }}>
              <div style={{ background: BG_MAP[p.emoji] || '#B8914A', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                {p.emoji || '📦'}
              </div>
              <div style={{ padding: '.9rem' }}>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '.97rem', marginBottom: '.2rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--t3)', fontSize: '.78rem', marginBottom: '.65rem' }}>{p.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>${p.price.toFixed(2)}</strong>
                  <div style={{ display: 'flex', gap: '.45rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className={p.isActive ? 'btn btn-outline btn-sm' : 'btn btn-green btn-sm'} onClick={() => toggleProduct(p)}>
                      {p.isActive ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && fundraiser && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--t3)' }}>
              <p style={{ fontWeight: 700 }}>No products yet</p>
              <p style={{ fontSize: '.9rem' }}>Click "Add Product" to create your first item.</p>
            </div>
          )}
        </div>
      )}

      <style>{`@media(max-width:900px){div[style*="repeat(3,1fr)"]{grid-template-columns:1fr 1fr!important}}`}</style>
    </AdminShell>
  );
}

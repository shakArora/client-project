import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fundraiserApi, productApi, vendorApi, adminApi, orderApi, driverApi } from '../lib/api';

const FRONTEND = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

const TABS = ['Fundraiser Details', 'Products', 'Vendors', 'Orders', 'Drivers'];

/* ───────────────────────── helpers ─────────────────────── */
const STATUS_COLOR = {
  pending:   '#6b7280', paid:    '#2563eb',
  fulfilled: '#7c3aed', delivered: '#059669',
  refunded:  '#dc2626', cancelled: '#9ca3af',
};

function Badge({ status }) {
  return (
    <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.2rem .55rem', borderRadius: 99, background: STATUS_COLOR[status] + '22', color: STATUS_COLOR[status], textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {status}
    </span>
  );
}

function isValidCover(url) {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  return /^https?:\/\//i.test(t);
}

function checks(fr, productCount) {
  return [
    { label: 'End date set',          ok: !!fr.endDate },
    { label: 'Delivery date set',     ok: !!fr.deliveryDate },
    { label: 'Contact info added',    ok: !!(fr.contactName && (fr.contactEmail || fr.contactPhone)) },
    { label: 'Delivery notes added',  ok: !!fr.deliveryNotes },
    { label: 'Cover image added',     ok: isValidCover(fr.coverImageUrl) },
    { label: 'At least 1 product',    ok: productCount > 0 },
  ];
}

/* ═══════════════════════ DETAILS TAB ═══════════════════════ */
function DetailsTab({ fr, onSaved }) {
  const [form,   setForm]   = useState({ ...fr });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState('');
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    productApi.list(fr._id).then(r => setProductCount((r.data || []).filter(p => p.isActive).length)).catch(() => {});
  }, [fr._id]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setNested = (outer, inner) => e => setForm(f => ({ ...f, [outer]: { ...(f[outer] || {}), [inner]: e.target.value } }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await fundraiserApi.update(fr._id, form);
      setMsg('Saved!');
      onSaved();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const chks     = checks(fr, productCount);
  const allGood  = chks.every(c => c.ok);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
      {/* Edit form */}
      <form onSubmit={handleSave}>
        <section style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border-lt)' }}>
            Basic Info
          </h3>
          <Field label="Fundraiser Name *"><input value={form.title || ''} onChange={set('title')} required /></Field>
          <Field label="Description"><textarea rows={3} value={form.description || ''} onChange={set('description')} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="City"><input value={form.location?.city || ''} onChange={setNested('location','city')} /></Field>
            <Field label="State"><input value={form.location?.state || ''} onChange={setNested('location','state')} /></Field>
          </div>
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border-lt)' }}>
            Important Dates ⚠️ Required for publishing
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Sale Starts"><input type="date" value={form.startDate ? form.startDate.slice(0,10) : ''} onChange={set('startDate')} /></Field>
            <Field label="Sale Ends *"><input type="date" value={form.endDate ? form.endDate.slice(0,10) : ''} onChange={set('endDate')} required /></Field>
            <Field label="Delivery Date *"><input type="date" value={form.deliveryDate ? form.deliveryDate.slice(0,10) : ''} onChange={set('deliveryDate')} required /></Field>
          </div>
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border-lt)' }}>
            Contact Point ⚠️ Shown to customers
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Contact Name *"><input value={form.contactName || ''} onChange={set('contactName')} placeholder="e.g. John Smith" /></Field>
            <Field label="Contact Phone *"><input type="tel" value={form.contactPhone || ''} onChange={set('contactPhone')} placeholder="(555) 000-0000" /></Field>
          </div>
          <Field label="Contact Email"><input type="email" value={form.contactEmail || ''} onChange={set('contactEmail')} /></Field>
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border-lt)' }}>
            Cover Image — required to publish
          </h3>
          <Field label="Cover Image URL * (must be an image link, not an emoji)">
            <input value={form.coverImageUrl || ''} onChange={set('coverImageUrl')} placeholder="https://example.com/cover-photo.jpg" required />
          </Field>
          {form.coverImageUrl && (
            <div style={{ marginTop: '.5rem', borderRadius: 'var(--r3)', overflow: 'hidden', maxHeight: 160, border: '1px solid var(--border-lt)' }}>
              <img src={form.coverImageUrl} alt="Cover preview" style={{ width: '100%', objectFit: 'cover', maxHeight: 160 }} onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}
        </section>

        <section style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '1px solid var(--border-lt)' }}>
            Delivery Details ⚠️ Shown at checkout
          </h3>
          <Field label="Delivery Instructions *">
            <textarea rows={3} value={form.deliveryNotes || ''} onChange={set('deliveryNotes')} placeholder="e.g. We deliver to your driveway. Bags will arrive by noon on delivery day." />
          </Field>
        </section>

        {msg && <p style={{ marginBottom: '1rem', color: msg === 'Saved!' ? '#059669' : '#dc2626', fontWeight: 700 }}>{msg}</p>}
        <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </form>

      {/* Sidebar: publish checklist */}
      <div>
        <div id="publish-checklist" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem' }}>
          <p style={{ fontWeight: 700, marginBottom: '.75rem', fontSize: '.88rem' }}>Publishing Checklist</p>
          <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginBottom: '.75rem' }}>
            {allGood ? 'All set — use Publish in the top-right corner.' : 'Complete every item below. The Publish button stays gray until all show ✅.'}
          </p>
          {chks.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.83rem', padding: '.22rem 0', color: c.ok ? '#065f46' : '#991b1b' }}>
              <span style={{ fontSize: '1rem' }}>{fr.isActive ? (c.ok ? '✅' : '❌') : (c.ok ? '✅' : '❌')}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="1fr 340px"] { grid-template-columns: 1fr !important; }
          div[style*="1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function FundraiserToggleButton({ fr, allGood, onToggled, compact, onIncomplete }) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fundraiserApi.activate(fr._id);
      onToggled();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    } finally {
      setBusy(false);
    }
  }

  function handleClick() {
    if (!allGood && !fr.isActive) {
      onIncomplete?.();
      return;
    }
    toggle();
  }

  const ready = allGood || fr.isActive;
  const incompleteHint = 'Complete the checklist in Fundraiser Details to publish';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={!allGood && !fr.isActive ? incompleteHint : fr.isActive ? 'Pause this fundraiser' : 'Go live'}
      style={{
        width: compact ? 'auto' : '100%',
        padding: compact ? '.45rem 1.1rem' : '.75rem',
        borderRadius: 10,
        border: 'none',
        fontWeight: 700,
        cursor: ready ? 'pointer' : 'not-allowed',
        background: fr.isActive ? '#fef3c7' : allGood ? '#059669' : '#e5e7eb',
        color: fr.isActive ? '#92400e' : allGood ? '#fff' : '#9ca3af',
        fontSize: compact ? '.84rem' : '1rem',
        transition: 'all .2s',
        boxShadow: allGood && !fr.isActive ? '0 0 0 2px rgba(5,150,105,.35)' : 'none',
      }}
    >
      {busy ? '…' : fr.isActive ? 'Pause' : allGood ? 'Publish' : 'Publish'}
    </button>
  );
}

function CustomerLinkBar({ fr }) {
  const publicUrl = `${FRONTEND}/fundraiser/${fr.slug}`;
  return (
    <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '.75rem clamp(1rem,4vw,2.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.06em' }}>Customer page for </span>
        <strong style={{ color: '#78350f', marginLeft: '.25rem' }}>{fr.title}</strong>
        <div style={{ marginTop: '.25rem' }}>
          <a href={publicUrl} target="_blank" rel="noreferrer" style={{ fontSize: '.82rem', color: 'var(--gold-dk)', wordBreak: 'break-all' }}>{publicUrl}</a>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(publicUrl)}
        style={{ fontSize: '.78rem', background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '.35rem .75rem', cursor: 'pointer', color: '#92400e', fontWeight: 600, flexShrink: 0 }}
      >
        Copy link
      </button>
    </div>
  );
}

/* ═══════════════════════ PRODUCTS TAB ══════════════════════ */
const EMOJI_GRID = ['📦','🌲','🍁','⭐','🎯','🏆','🎪','🌿','🦁','🐯','🌊','🔥','💎','🎁','🌸','🍀'];

function ProductsTab({ fr }) {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name:'', description:'', price:'', emoji:'📦', imageUrl:'', isActive: true });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    productApi.list(fr._id).then(r => setProducts(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [fr._id]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function openCreate() { setEditing(null); setForm({ name:'', description:'', price:'', emoji:'📦', imageUrl:'', isActive: true }); setShowForm(true); setError(''); }
  function openEdit(p)  { setEditing(p); setForm({ name: p.name, description: p.description||'', price: p.price, emoji: p.emoji||'📦', imageUrl: p.imageUrl||'', isActive: p.isActive }); setShowForm(true); setError(''); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, price: parseFloat(form.price), fundraiserId: fr._id };
      if (editing) await productApi.update(editing._id, payload);
      else          await productApi.create(payload);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p) {
    try {
      await productApi.update(p._id, { isActive: !p.isActive });
      load();
    } catch {
      alert('Failed to update product.');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Products</h3>
        <button onClick={openCreate} className="btn btn-gold" style={{ fontSize: '.85rem' }}>+ Add Product</button>
      </div>

      {loading ? <p style={{ color: 'var(--t3)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {products.map(p => (
            <div key={p._id} style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,.06)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.emoji || '📦')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{p.name}</div>
                {p.description && <div style={{ fontSize: '.8rem', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                <div style={{ fontSize: '.85rem', color: 'var(--gold-dk)', fontWeight: 700 }}>${p.price.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                <button onClick={() => toggleActive(p)} style={{ fontSize: '.75rem', padding: '.3rem .65rem', borderRadius: 8, border: '1px solid var(--border)', background: p.isActive ? '#d1fae5' : '#f3f4f6', color: p.isActive ? '#065f46' : '#6b7280', cursor: 'pointer', fontWeight: 600 }}>
                  {p.isActive ? 'Active' : 'Hidden'}
                </button>
                <button onClick={() => openEdit(p)} style={{ fontSize: '.75rem', padding: '.3rem .65rem', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '2rem' }}>No products yet. Add your first one!</p>}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', overflowY: 'auto' }}>
          <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: '1.25rem' }}>{editing ? 'Edit' : 'Add'} Product</h3>
            <Field label="Name *"><input value={form.name} onChange={set('name')} required /></Field>
            <Field label="Description"><textarea rows={3} value={form.description} onChange={set('description')} placeholder="Describe the product for customers…" /></Field>
            <Field label="Price ($) *"><input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required /></Field>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '.4rem' }}>Image URL (optional)</label>
              <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://… or leave blank to use emoji" style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.6rem', fontSize: '.9rem', boxSizing: 'border-box' }} />
              {form.imageUrl && <img src={form.imageUrl} alt="preview" style={{ marginTop: '.5rem', width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} onError={e => e.target.style.display='none'} />}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '.4rem' }}>Emoji (used if no image)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginBottom: '.4rem' }}>
                {EMOJI_GRID.map(em => (
                  <button key={em} type="button" onClick={() => setForm(f => ({ ...f, emoji: em }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: form.emoji === em ? '2px solid var(--gold-dk)' : '2px solid var(--border)', background: form.emoji === em ? '#fffbeb' : '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>
                    {em}
                  </button>
                ))}
              </div>
              <input value={form.emoji} onChange={set('emoji')} placeholder="Or type any emoji" style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 8, padding: '.4rem .6rem', fontSize: '1.1rem', boxSizing: 'border-box' }} maxLength={8} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.25rem', cursor: 'pointer', fontSize: '.9rem' }}>
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              Show on customer page
            </label>

            {error && <p style={{ color: '#dc2626', fontSize: '.85rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-gold" style={{ flex: 2 }} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ VENDORS TAB ═══════════════════════ */
function VendorsTab({ fr }) {
  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name:'', email:'', password:'', referralCode:'' });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const publicUrl = `${FRONTEND}/fundraiser/${fr.slug}`;

  const load = useCallback(() => {
    setLoading(true);
    vendorApi.list({ fundraiserId: fr._id })
      .then(r => setVendors(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fr._id]);

  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await adminApi.createVendor({ ...form, fundraiserId: fr._id, referralCode: form.referralCode.toUpperCase() });
      setShowForm(false);
      setForm({ name:'', email:'', password:'', referralCode:'' });
      setMsg('✅ Vendor added!');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to add vendor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Vendors</h3>
        <button onClick={() => { setShowForm(true); setMsg(''); }} className="btn btn-gold" style={{ fontSize: '.85rem' }}>+ Add Vendor</button>
      </div>

      {/* Customer link reminder */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1.25rem', fontSize: '.83rem' }}>
        <strong style={{ color: '#92400e' }}>Vendor link format:</strong>
        <span style={{ color: '#b45309', wordBreak: 'break-all', marginLeft: '.5rem' }}>{publicUrl}?ref=CODE</span>
        <p style={{ color: '#b45309', marginTop: '.3rem', fontSize: '.78rem' }}>Each vendor's unique link uses their referral code.</p>
      </div>

      {msg && <p style={{ color: msg.startsWith('✅') ? '#059669' : '#dc2626', marginBottom: '1rem', fontWeight: 600 }}>{msg}</p>}

      {loading ? <p style={{ color: 'var(--t3)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {vendors.map(v => (
            <div key={v._id} style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,.06)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{v.name}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--t3)' }}>{v.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--gold-dk)', fontFamily: 'monospace' }}>{v.referralCode}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{v.bagsSold || 0} bags · ${(v.totalRevenue||0).toFixed(0)}</div>
                <a href={`${publicUrl}?ref=${v.referralCode}`} target="_blank" rel="noreferrer" style={{ fontSize: '.72rem', color: 'var(--gold-dk)' }}>Customer link ↗</a>
              </div>
            </div>
          ))}
          {vendors.length === 0 && <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '2rem' }}>No vendors yet.</p>}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <form onSubmit={handleAdd} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: '1.25rem' }}>Add Vendor</h3>
            <Field label="Name *"><input value={form.name} onChange={set('name')} required /></Field>
            <Field label="Email *"><input type="email" value={form.email} onChange={set('email')} required /></Field>
            <Field label="Temporary Password *">
              <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <p style={{ fontSize: '.75rem', color: 'var(--t3)', marginTop: '-.5rem', marginBottom: '.75rem' }}>
              Min 8 chars · uppercase · lowercase · number · special character
            </p>
            <Field label="Referral Code (2–6 chars) *">
              <input value={form.referralCode} onChange={e => setForm(f => ({ ...f, referralCode: e.target.value.toUpperCase() }))} maxLength={6} required placeholder="e.g. AJ47" />
            </Field>
            <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginBottom: '1.25rem' }}>
              The vendor's link will be: {publicUrl}?ref={form.referralCode || 'CODE'}
            </p>
            {msg && <p style={{ color: '#dc2626', marginBottom: '.75rem', fontSize: '.85rem' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-gold" style={{ flex: 2 }} disabled={saving}>{saving ? 'Adding…' : 'Add Vendor'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ ORDERS TAB ════════════════════════ */
function OrdersTab({ fr }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    orderApi.list({ fundraiserId: fr._id }).then(r => setOrders(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [fr._id]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try { await orderApi.updateStatus(id, status); load(); setSelected(null); } catch { alert('Failed.'); }
  }

  async function handleRefund(id) {
    if (!window.confirm('Are you sure you want to refund this order? This cannot be undone.')) return;
    try { await orderApi.refund(id); load(); setSelected(null); } catch (err) { alert(err.response?.data?.message || 'Refund failed.'); }
  }

  const total = orders.reduce((s, o) => s + o.totalAmount, 0);
  const paid  = orders.filter(o => ['paid','fulfilled','delivered'].includes(o.status)).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[['Total Orders', orders.length], ['Paid', paid], ['Revenue', `$${total.toFixed(2)}`]].map(([l,v]) => (
          <div key={l} style={{ background: '#fff', borderRadius: 12, padding: '.85rem 1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--t3)' }}>{l}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--t3)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {orders.map(o => (
            <button key={o._id} onClick={() => setSelected(o)} style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 1px 8px rgba(0,0,0,.06)', textAlign: 'left', border: 'none', cursor: 'pointer', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{o.customerName}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--t3)' }}>{o.deliveryAddress}</div>
              </div>
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '.88rem', fontWeight: 700 }}>{o.totalBags} bags · ${o.totalAmount.toFixed(2)}</span>
                <Badge status={o.status} />
              </div>
            </button>
          ))}
          {orders.length === 0 && <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '2rem' }}>No orders yet.</p>}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 500 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: '1rem' }}>Order Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem .85rem', marginBottom: '1.25rem' }}>
              {[['Customer', selected.customerName], ['Email', selected.customerEmail], ['Phone', selected.customerPhone||'—'], ['Address', selected.deliveryAddress], ['Referral', selected.referralCode||'—'], ['Status', '']].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
                  {l === 'Status' ? <Badge status={selected.status} /> : <div style={{ fontSize: '.9rem', fontWeight: 600 }}>{v}</div>}
                </div>
              ))}
            </div>

            {selected.comments && <p style={{ background: 'var(--surface)', borderRadius: 8, padding: '.75rem', fontSize: '.85rem', marginBottom: '1rem' }}><strong>Notes: </strong>{selected.comments}</p>}

            <div style={{ borderTop: '1px solid var(--border-lt)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              {(selected.items || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem', padding: '.3rem 0' }}>
                  <span>{item.productName} × {item.quantity}</span>
                  <strong>${((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: '.5rem', paddingTop: '.5rem', borderTop: '2px solid var(--border-lt)' }}>
                <span>Total</span><span>${selected.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Status actions */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {['pending','paid','fulfilled','delivered'].map(s => (
                <button key={s} onClick={() => updateStatus(selected._id, s)} style={{ fontSize: '.75rem', padding: '.3rem .7rem', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: selected.status === s ? 'var(--dark)' : '#fff', color: selected.status === s ? '#fff' : 'var(--t2)', fontWeight: selected.status === s ? 700 : 400 }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Refund button */}
            {!['refunded','cancelled'].includes(selected.status) && (
              <button onClick={() => handleRefund(selected._id)} style={{ width: '100%', padding: '.6rem', borderRadius: 10, border: '2px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer', marginBottom: '1rem', fontSize: '.88rem' }}>
                🔄 Refund This Order
              </button>
            )}

            <button onClick={() => setSelected(null)} className="btn btn-outline" style={{ width: '100%' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ DRIVERS TAB ═══════════════════════ */
function DriversTab({ fr }) {
  const [routes,    setRoutes]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ driverName:'', capacity:'', driverPhone:'' });
  const [saving,    setSaving]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg,       setMsg]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    driverApi.listRoutes({ fundraiserId: fr._id })
      .then(r => setRoutes(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fr._id]);

  useEffect(() => { load(); }, [load]);

  async function addDriver(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await driverApi.addDriver({ fundraiserId: fr._id, driverName: form.driverName.trim(), capacity: Number(form.capacity), driverPhone: form.driverPhone });
      setShowForm(false);
      setForm({ driverName:'', capacity:'', driverPhone:'' });
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to add driver.');
    } finally {
      setSaving(false);
    }
  }

  async function removeDriver(id) {
    if (!window.confirm('Remove this driver?')) return;
    await driverApi.deleteDriver(id).catch(() => {});
    load();
  }

  async function generateRoutes() {
    setGenerating(true); setMsg('');
    try {
      const res = await driverApi.generateRoutes(fr._id);
      setMsg(`✅ ${res.data.message}`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Route generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const hasActiveStops = routes.some(r => (r.stops || []).some(s => s.status !== 'delivered'));
  const hasRoutes      = routes.length > 0;
  const isDeliveryDay  = routes.some(r => r.stops?.some(s => s.status === 'delivered'));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem' }}>Drivers & Routes</h3>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowForm(true); setMsg(''); }} className="btn btn-outline" style={{ fontSize: '.85rem' }}>+ Add Driver</button>
          <button onClick={generateRoutes} disabled={generating || !hasRoutes} className="btn btn-gold" style={{ fontSize: '.85rem' }}>
            {generating ? 'Generating…' : isDeliveryDay ? '🔄 Re-Route Mid-Delivery' : '🗺 Generate Routes'}
          </button>
        </div>
      </div>

      {isDeliveryDay && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1rem', fontSize: '.84rem', color: '#9a3412' }}>
          <strong>🚚 Delivery in progress.</strong> You can re-generate routes at any time — delivered stops will be preserved and undelivered stops will be redistributed among available drivers.
        </div>
      )}

      {!isDeliveryDay && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1.25rem', fontSize: '.84rem', color: '#1e40af' }}>
          <strong>How it works:</strong> Add each driver with their bag capacity — a unique code is assigned automatically. When orders exist, routes fill in automatically. You can also click <em>Generate Routes</em> to redistribute stops.
        </div>
      )}

      {/* Color legend */}
      <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[['#BF3535','Pending'],['#C9A862','In Progress'],['#4E6D38','Delivered']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.78rem', color: 'var(--t3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />{l}
          </div>
        ))}
      </div>

      {msg && <p style={{ marginBottom: '1rem', fontWeight: 600, color: msg.startsWith('✅') ? '#059669' : '#dc2626' }}>{msg}</p>}

      {loading ? <p style={{ color: 'var(--t3)' }}>Loading…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {routes.map(r => {
            const currentStopIdx = (r.stops || []).findIndex(s => s.status !== 'delivered');
            const driverUrl = `${FRONTEND}/driver/${r.otp}`;
            return (
              <div key={r._id} style={{ background: '#fff', borderRadius: 12, padding: '1.1rem 1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.97rem' }}>{r.driverName}</div>
                    {r.driverPhone && <div style={{ fontSize: '.82rem', color: 'var(--t3)' }}>📞 {r.driverPhone}</div>}
                    <div style={{ display: 'flex', gap: '.6rem', marginTop: '.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '.78rem', background: '#f3f4f6', borderRadius: 6, padding: '.2rem .6rem', fontFamily: 'monospace', fontWeight: 700 }}>OTP: {r.otp}</span>
                      <span style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Cap: {r.capacity} bags</span>
                      <span style={{ fontSize: '.78rem', color: r.completedStops === r.stops?.length && r.stops?.length > 0 ? '#059669' : 'var(--t3)', fontWeight: r.completedStops === r.stops?.length && r.stops?.length > 0 ? 700 : 400 }}>
                        {r.completedStops || 0}/{r.stops?.length || 0} stops
                      </span>
                    </div>
                    <div style={{ marginTop: '.4rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                      <a href={driverUrl} target="_blank" rel="noreferrer" style={{ fontSize: '.75rem', color: 'var(--gold-dk)', textDecoration: 'underline' }}>{driverUrl}</a>
                      <button onClick={() => navigator.clipboard?.writeText(driverUrl)} style={{ fontSize: '.7rem', background: 'none', border: '1px solid var(--border-lt)', borderRadius: 5, padding: '.1rem .45rem', cursor: 'pointer', color: 'var(--t3)' }}>Copy</button>
                    </div>
                  </div>
                  <button onClick={() => removeDriver(r._id)} style={{ fontSize: '.75rem', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '.25rem .6rem', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                    Remove
                  </button>
                </div>

                {/* Progress bar */}
                {r.stops?.length > 0 && (
                  <div style={{ marginBottom: '.7rem' }}>
                    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.progress || 0}%`, background: r.progress === 100 ? '#4E6D38' : 'linear-gradient(90deg,#C9A862,#4E6D38)', borderRadius: 99, transition: 'width .4s' }} />
                    </div>
                    <p style={{ fontSize: '.73rem', color: 'var(--t3)', marginTop: '.25rem' }}>{r.progress || 0}% delivered</p>
                  </div>
                )}

                {/* Colored stop list */}
                {r.stops?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                    {r.stops.map((s, i) => {
                      const isDelivered = s.status === 'delivered';
                      const isCurrent   = i === currentStopIdx;
                      const dotColor    = isDelivered ? '#4E6D38' : isCurrent ? '#C9A862' : '#BF3535';
                      return (
                        <div key={i} title={`Stop ${i+1}: ${s.customerName} — ${s.status}`} style={{
                          display: 'flex', alignItems: 'center', gap: '.35rem',
                          background: isDelivered ? 'rgba(78,109,56,.08)' : isCurrent ? 'rgba(201,168,98,.12)' : 'rgba(191,53,53,.07)',
                          borderRadius: 6, padding: '.25rem .55rem', fontSize: '.74rem',
                          border: `1px solid ${dotColor}33`,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ color: isDelivered ? '#4E6D38' : isCurrent ? '#92400e' : '#9b1c1c', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.customerName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {routes.length === 0 && <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '2rem' }}>No drivers yet. Add your first driver to get started.</p>}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <form onSubmit={addDriver} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: '1.25rem' }}>Add Driver</h3>
            <Field label="Driver Name *"><input value={form.driverName} onChange={set('driverName')} required /></Field>
            <Field label="Phone (optional)"><input type="tel" value={form.driverPhone} onChange={set('driverPhone')} /></Field>
            <Field label="Bag Capacity *">
              <input type="number" min="1" value={form.capacity} onChange={set('capacity')} required placeholder="How many bags can this driver deliver?" />
            </Field>
            <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginBottom: '1.25rem' }}>A unique driver code will be auto-generated.</p>
            {msg && <p style={{ color: '#dc2626', fontSize: '.85rem', marginBottom: '.75rem' }}>{msg}</p>}
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-gold" style={{ flex: 2 }} disabled={saving}>{saving ? 'Adding…' : 'Add Driver'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ FIELD COMPONENT ════════════════════ */
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>{label}</label>
      <div className="field-wrap">{children}</div>
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ═════════════════════════ */
export default function AdminFundraiserDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [fr,    setFr]    = useState(null);
  const [tab,   setTab]   = useState('Fundraiser Details');
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    fundraiserApi.get(id).then(r => setFr(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!id) return;
    productApi.list(id)
      .then(r => setProductCount((r.data || []).filter(p => p.isActive).length))
      .catch(() => setProductCount(0));
  }, [id, fr?.updatedAt, fr?._id]);

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--t3)' }}>Loading…</div>;
  if (!fr)     return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--t3)' }}>Fundraiser not found.</div>;

  const allGood = checks(fr, productCount).every(c => c.ok);

  function goToChecklist() {
    setTab('Fundraiser Details');
    setTimeout(() => document.getElementById('publish-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--dark)', padding: '0 clamp(1rem,4vw,2.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: '.88rem', flexShrink: 0 }}>
            ← All Fundraisers
          </button>
          <span style={{ color: 'rgba(255,255,255,.25)' }}>|</span>
          <span style={{ color: 'var(--t-cream)', fontFamily: 'var(--serif)', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fr.title}</span>
          <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.2rem .55rem', borderRadius: 99, background: fr.isActive ? '#d1fae533' : 'rgba(255,255,255,.1)', color: fr.isActive ? '#6ee7b7' : 'rgba(255,255,255,.5)', flexShrink: 0 }}>
            {fr.isActive ? '● Live' : '○ Paused'}
          </span>
        </div>
        <FundraiserToggleButton fr={fr} allGood={allGood} onToggled={reload} compact onIncomplete={goToChecklist} />
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '2px solid var(--border-lt)', display: 'flex', overflowX: 'auto', padding: '0 clamp(1rem,4vw,2.5rem)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '1rem 1.25rem', border: 'none', borderBottom: t === tab ? '2.5px solid var(--gold-dk)' : '2.5px solid transparent', background: 'none', fontWeight: t === tab ? 700 : 400, color: t === tab ? 'var(--gold-dk)' : 'var(--t3)', cursor: 'pointer', fontSize: '.9rem', whiteSpace: 'nowrap', marginBottom: '-2px' }}>
            {t}
          </button>
        ))}
      </div>

      <CustomerLinkBar fr={fr} />

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem)' }}>
        {tab === 'Fundraiser Details' && <DetailsTab  fr={fr} onSaved={reload} />}
        {tab === 'Products'           && <ProductsTab fr={fr} />}
        {tab === 'Vendors'            && <VendorsTab  fr={fr} />}
        {tab === 'Orders'             && <OrdersTab   fr={fr} />}
        {tab === 'Drivers'            && <DriversTab  fr={fr} />}
      </div>

      <style>{`
        .field-wrap input,
        .field-wrap textarea,
        .field-wrap select {
          width: 100%;
          border: 2px solid var(--border);
          border-radius: 10px;
          padding: .6rem .75rem;
          font-size: .92rem;
          box-sizing: border-box;
          font-family: var(--sans);
          background: #fff;
          outline: none;
        }
        .field-wrap input:focus,
        .field-wrap textarea:focus {
          border-color: var(--gold-dk);
        }
      `}</style>
    </div>
  );
}

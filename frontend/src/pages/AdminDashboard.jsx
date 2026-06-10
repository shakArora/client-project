import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fundraiserApi } from '../lib/api';

const FRONTEND = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

function isValidCover(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url.trim());
}

function statusChecks(fr) {
  return [
    { label: 'End date set',           ok: !!fr.endDate },
    { label: 'Delivery date set',      ok: !!fr.deliveryDate },
    { label: 'Contact info added',     ok: !!(fr.contactName && (fr.contactEmail || fr.contactPhone)) },
    { label: 'Delivery notes added',   ok: !!fr.deliveryNotes },
    { label: 'Cover image added',      ok: isValidCover(fr.coverImageUrl) },
  ];
}

function FundraiserCard({ fr, onToggle }) {
  const navigate = useNavigate();
  const checks   = statusChecks(fr);
  const allGood  = checks.every(c => c.ok);
  const publicUrl = `${FRONTEND}/fundraiser/${fr.slug}`;

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Top colour band */}
      <div style={{ height: 6, background: fr.isActive ? 'linear-gradient(90deg,#C9A862,#9A7535)' : 'var(--border)' }} />

      <div style={{ padding: '1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '.6rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', lineHeight: 1.25 }}>{fr.title}</h2>
          <span style={{ fontSize: '.72rem', fontWeight: 700, padding: '.25rem .65rem', borderRadius: 99, whiteSpace: 'nowrap', background: fr.isActive ? '#d1fae5' : '#f3f4f6', color: fr.isActive ? '#065f46' : '#6b7280' }}>
            {fr.isActive ? '● Live' : '○ Paused'}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Orders', value: fr.orderCount  || 0 },
            { label: 'Bags',   value: fr.soldBags    || 0 },
            { label: 'Revenue',value: `$${(fr.totalRevenue || 0).toFixed(0)}` },
            { label: 'Vendors',value: fr.vendorCount || 0 },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '.85rem', marginBottom: '1rem' }}>
          {checks.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem', padding: '.15rem 0', color: c.ok ? '#065f46' : '#92400e' }}>
              <span>{c.ok ? '✅' : '❌'}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Customer link */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '.65rem .85rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '.7rem', fontWeight: 700, color: '#92400e', marginBottom: '.2rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Customer Link</p>
          <a href={publicUrl} target="_blank" rel="noreferrer" style={{ fontSize: '.8rem', color: 'var(--gold-dk)', wordBreak: 'break-all' }}>{publicUrl}</a>
        </div>

        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/admin/fundraiser/${fr._id}`)}
            className="btn btn-dark"
            style={{ flex: 1 }}
          >
            Open →
          </button>

          {/* Publish / Go Live button */}
          <button
            onClick={() => allGood ? onToggle(fr._id) : null}
            title={!allGood ? 'Complete the checklist above to publish' : fr.isActive ? 'Pause this fundraiser' : 'Go live!'}
            style={{
              padding: '.55rem 1rem',
              borderRadius: 10,
              border: 'none',
              fontWeight: 700,
              fontSize: '.84rem',
              cursor: allGood ? 'pointer' : 'not-allowed',
              background: fr.isActive ? '#fef3c7' : allGood ? '#059669' : '#e5e7eb',
              color: fr.isActive ? '#92400e' : allGood ? '#fff' : '#9ca3af',
              transition: 'all .2s',
            }}
          >
            {fr.isActive ? 'Pause' : allGood ? 'Publish' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [viewTab,  setViewTab]  = useState('active');

  function load() {
    setLoading(true);
    fundraiserApi.mine()
      .then(r => setList(r.data || []))
      .catch(() => setError('Could not load fundraisers.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fundraiserApi.create({ title: newTitle.trim() });
      setCreating(false);
      setNewTitle('');
      navigate(`/admin/fundraiser/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not create fundraiser.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    try {
      await fundraiserApi.activate(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not toggle fundraiser.');
    }
  }

  const name = user?.name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const now = new Date();
  const active = list.filter(fr => fr.isActive || (fr.endDate && new Date(fr.endDate) >= now));
  const past   = list.filter(fr => !fr.isActive && (!fr.endDate || new Date(fr.endDate) < now));
  const display = viewTab === 'active' ? active : past;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--sans)' }}>
      {/* Top nav */}
      <div style={{ background: 'var(--dark)', padding: '0 clamp(1rem,4vw,2.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--t-cream)', fontWeight: 700 }}>Routed</span>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span style={{ color: '#999', fontSize: '.82rem' }}>{user?.email}</span>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '.3rem .7rem', color: 'rgba(255,255,255,.65)', fontSize: '.78rem', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,2rem)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,4vw,2.1rem)', marginBottom: '.2rem' }}>
              {greeting}, {name} 👋
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>Manage your fundraisers below.</p>
          </div>
          <button onClick={() => setCreating(true)} className="btn btn-gold">+ New Fundraiser</button>
        </div>

        {/* Active / Past tabs */}
        <div style={{ display: 'flex', gap: '.4rem', marginBottom: '1.5rem' }}>
          {[['active', `Active (${active.length})`], ['past', `Past (${past.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setViewTab(key)} style={{
              padding: '.45rem 1.2rem', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '.88rem', fontWeight: 700, transition: 'all .15s',
              background: viewTab === key ? 'var(--dark)' : 'var(--surface-2)',
              color: viewTab === key ? '#fff' : 'var(--t3)',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Create modal */}
        {creating && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 440 }}>
              <h2 style={{ fontFamily: 'var(--serif)', marginBottom: '1.2rem' }}>New Fundraiser</h2>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Fundraiser name (e.g. Troop 42 Spring 2025)"
                style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.75rem', fontSize: '.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <button type="button" onClick={() => setCreating(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ flex: 2 }} disabled={saving}>
                  {saving ? 'Creating…' : 'Create & Set Up →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem' }}>Loading…</p>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1.5rem', textAlign: 'center', color: '#991b1b' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⚠️</p>
            <p style={{ fontWeight: 700, marginBottom: '.3rem' }}>Could not load fundraisers</p>
            <p style={{ fontSize: '.88rem', marginBottom: '1rem' }}>Check your internet connection and try again.</p>
            <button onClick={load} className="btn btn-outline" style={{ fontSize: '.85rem' }}>Retry</button>
          </div>
        ) : display.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{viewTab === 'past' ? '🗂' : '📣'}</div>
            <h2 style={{ fontFamily: 'var(--serif)', marginBottom: '.5rem' }}>
              {viewTab === 'past' ? 'No past fundraisers' : 'No active fundraisers'}
            </h2>
            <p style={{ color: 'var(--t3)', marginBottom: '1.5rem', fontSize: '.92rem' }}>
              {viewTab === 'past' ? 'Completed fundraisers will appear here.' : 'Create your first fundraiser to get started.'}
            </p>
            {viewTab === 'active' && <button onClick={() => setCreating(true)} className="btn btn-gold">+ New Fundraiser</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {display.map(fr => (
              <FundraiserCard key={fr._id} fr={fr} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

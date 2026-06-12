import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fundraiserApi } from '../lib/api';
import { isPastFundraiser } from '../lib/dates';
import { US_STATES } from '../lib/usStates';
import { SkeletonDashboard } from '../components/Skeleton';

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
    { label: 'Payment info added',     ok: !!(fr.paymentMethod && fr.paymentDestination) },
    { label: 'Cover image added',      ok: isValidCover(fr.coverImageUrl) },
  ];
}

function FundraiserCard({ fr, onToggle, onDelete, showDelete }) {
  const navigate = useNavigate();
  const checks   = statusChecks(fr);
  const allGood  = checks.every(c => c.ok);
  const publicUrl = `${FRONTEND}/fundraiser/${fr.slug}`;

  return (
    <div className="fundraiser-card">
      <div className={`fundraiser-card-band ${fr.isActive ? '' : 'fundraiser-card-band--paused'}`} />

      <div className="fundraiser-card-body">
        <div className="fundraiser-card-header">
          <h2>{fr.title}</h2>
          <span className={`admin-badge ${fr.isActive ? 'admin-badge--live' : 'admin-badge--paused'}`}>
            {fr.isActive ? '● Live' : '○ Paused'}
          </span>
        </div>

        <div className="fundraiser-card-stats">
          {[
            { label: 'Orders', value: fr.orderCount  || 0 },
            { label: 'Bags',   value: fr.soldBags    || 0 },
            { label: 'Revenue',value: `$${(fr.totalRevenue || 0).toFixed(0)}` },
            { label: 'Vendors',value: fr.vendorCount || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="fundraiser-card-stat">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="fundraiser-card-checklist">
          {checks.map(c => (
            <div key={c.label} className={`fundraiser-card-check ${c.ok ? 'fundraiser-card-check--ok' : 'fundraiser-card-check--no'}`}>
              <span>{c.ok ? '✅' : '❌'}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        <div className="fundraiser-card-linkbox">
          <p>Customer Link</p>
          <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
        </div>

        <div className="fundraiser-card-actions">
          <button type="button" onClick={() => navigate(`/admin/fundraiser/${fr._id}`)} className="btn btn-dark" style={{ flex: 1 }}>
            Open →
          </button>
          {showDelete && (
            <button type="button" onClick={() => onDelete(fr._id)} className="btn-delete-draft">Delete</button>
          )}
          <button
            type="button"
            onClick={() => allGood ? onToggle(fr._id) : null}
            title={!allGood ? 'Complete the checklist above to publish' : fr.isActive ? 'Pause this fundraiser' : 'Go live!'}
            className={`btn-publish ${fr.isActive ? 'btn-publish--pause' : allGood ? 'btn-publish--ready' : 'btn-publish--disabled'}`}
          >
            {fr.isActive ? 'Pause' : 'Publish'}
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
  const [newPickup, setNewPickup] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
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
      const res = await fundraiserApi.create({
        title: newTitle.trim(),
        pickupAddress: newPickup.trim() || undefined,
        deliveryHubAddress: newPickup.trim() || undefined,
        location: (newCity.trim() || newState) ? { city: newCity.trim() || undefined, state: newState || undefined } : undefined,
      });
      setCreating(false);
      setNewTitle('');
      setNewPickup('');
      setNewCity('');
      setNewState('');
      navigate(`/admin/fundraiser/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not create fundraiser.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this draft fundraiser? This cannot be undone.')) return;
    try {
      await fundraiserApi.delete(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete fundraiser.');
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
  const active = list.filter(fr => fr.isActive);
  const drafts = list.filter(fr => !fr.isActive && !isPastFundraiser(fr));
  const past   = list.filter(fr => !fr.isActive && isPastFundraiser(fr));
  const display = viewTab === 'active' ? active : viewTab === 'drafts' ? drafts : past;

  return (
    <div className="app-shell">
      <div className="admin-topbar">
        <Link to="/" className="admin-topbar-brand">Routed<span>.</span></Link>
        <div className="admin-topbar-end">
          <span className="admin-topbar-email">{user?.email}</span>
          <button type="button" onClick={() => { logout(); navigate('/login'); }} className="admin-topbar-logout">
            Log out
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="page-header">
          <div>
            <h1>{greeting}, {name} 👋</h1>
            <p>Manage your fundraisers below.</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="btn btn-gold">+ New Fundraiser</button>
        </div>

        <div className="pill-tabs">
          {[['active', `Active (${active.length})`], ['drafts', `Drafts (${drafts.length})`], ['past', `Past (${past.length})`]].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setViewTab(key)} className={viewTab === key ? 'active' : ''}>
              {label}
            </button>
          ))}
        </div>

        {creating && (
          <div className="modal-overlay">
            <form onSubmit={handleCreate} className="modal-card">
              <h2 style={{ fontFamily: 'var(--serif)', marginBottom: '1.2rem' }}>New Fundraiser</h2>
              <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>Fundraiser name *</label>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Troop 42 Spring Mulch Sale"
                style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.75rem', fontSize: '.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
              <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>Fundraiser address</label>
              <input
                value={newPickup}
                onChange={e => setNewPickup(e.target.value)}
                placeholder="Pickup location & driver route starting point"
                style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.75rem', fontSize: '.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>City</label>
                  <input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Springfield" style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.75rem', fontSize: '.95rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>State</label>
                  <select value={newState} onChange={e => setNewState(e.target.value)} style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 10, padding: '.75rem', fontSize: '.95rem', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="">Select state</option>
                    {US_STATES.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
                  </select>
                </div>
              </div>
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
          <SkeletonDashboard />
        ) : error ? (
          <div className="error-banner">
            <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⚠️</p>
            <p style={{ fontWeight: 700, marginBottom: '.3rem' }}>Could not load fundraisers</p>
            <p style={{ fontSize: '.88rem', marginBottom: '1rem' }}>Check your internet connection and try again.</p>
            <button type="button" onClick={load} className="btn btn-outline" style={{ fontSize: '.85rem' }}>Retry</button>
          </div>
        ) : display.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{viewTab === 'past' ? '🗂' : viewTab === 'drafts' ? '📝' : '📣'}</div>
            <h2>
              {viewTab === 'past' ? 'No past fundraisers' : viewTab === 'drafts' ? 'No drafts' : 'No active fundraisers'}
            </h2>
            <p>
              {viewTab === 'past' ? 'Completed fundraisers will appear here.' : viewTab === 'drafts' ? 'Unpublished fundraisers appear here while you set them up.' : 'Create your first fundraiser to get started.'}
            </p>
            {viewTab !== 'past' && <button type="button" onClick={() => setCreating(true)} className="btn btn-gold">+ New Fundraiser</button>}
          </div>
        ) : (
          <div className="fundraiser-grid">
            {display.map(fr => (
              <FundraiserCard key={fr._id} fr={fr} onToggle={handleToggle} onDelete={handleDelete} showDelete={viewTab === 'drafts'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

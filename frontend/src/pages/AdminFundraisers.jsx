/**
 * AdminShell page for listing and creating fundraisers with a simple inline form.
 * Uses the active-fundraiser hook to load the admin's campaigns and create or edit basic fundraiser metadata.
 * @author Shivum Arora
 * @date 6/14/2026
 */
import { useState } from 'react';
import AdminShell from '../components/AdminShell';
import { fundraiserApi } from '../lib/api';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

const EMPTY = {
  title: '', description: '', city: '', state: '',
  startDate: '', endDate: '', deliveryDate: '', isActive: false,
};

export default function AdminFundraisers() {
  const { fundraiser, list, loading, reload } = useActiveFundraiser();

  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null); // fundraiser object being edited
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setShowForm(true);
  }

  function openEdit(fr) {
    setEditing(fr);
    setForm({
      title:       fr.title       || '',
      description: fr.description || '',
      city:        fr.location?.city  || '',
      state:       fr.location?.state || '',
      startDate:   fr.startDate ? fr.startDate.slice(0, 10) : '',
      endDate:     fr.endDate   ? fr.endDate.slice(0, 10)   : '',
      deliveryDate:fr.deliveryDate ? fr.deliveryDate.slice(0, 10) : '',
      isActive:    fr.isActive || false,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      title:        form.title,
      description:  form.description || undefined,
      location:     { city: form.city, state: form.state },
      startDate:    form.startDate    ? new Date(form.startDate).toISOString()    : undefined,
      endDate:      form.endDate      ? new Date(form.endDate).toISOString()      : undefined,
      deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : undefined,
      isActive:     form.isActive,
    };
    try {
      if (editing) {
        await fundraiserApi.update(editing._id, payload);
      } else {
        await fundraiserApi.create(payload);
      }
      setShowForm(false);
      reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fundraiser.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(fr) {
    try {
      await fundraiserApi.activate(fr._id);
      reload();
    } catch {}
  }

  return (
    <AdminShell fundraiser={fundraiser}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.25rem' }}>Fundraisers</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>{list.length} total</p>
        </div>
        <button className="btn btn-gold" onClick={openCreate}>+ New Fundraiser</button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', padding: '1.4rem', marginBottom: '1.4rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: '1.1rem' }}>
            {editing ? 'Edit Fundraiser' : 'Create Fundraiser'}
          </h2>
          {error && <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.65rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '.9rem' }}>{error}</div>}
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Title *">
                <input placeholder="Troop 42 Spring 2025 Fundraiser" value={form.title} onChange={set('title')} required />
              </Field>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Description">
                <textarea placeholder="Help Troop 42 fund their adventures!" rows={2} value={form.description} onChange={set('description')} style={{ resize: 'vertical' }} />
              </Field>
            </div>
            <Field label="City"><input placeholder="Springfield" value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><input placeholder="IL" value={form.state} onChange={set('state')} /></Field>
            <Field label="Start Date"><input type="date" value={form.startDate} onChange={set('startDate')} /></Field>
            <Field label="End Date (ordering closes)"><input type="date" value={form.endDate} onChange={set('endDate')} /></Field>
            <Field label="Delivery Date"><input type="date" value={form.deliveryDate} onChange={set('deliveryDate')} /></Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingTop: '1.5rem' }}>
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={set('isActive')} style={{ width: 16, height: 16, accentColor: 'var(--gold)' }} />
              <label htmlFor="isActive" style={{ fontSize: '.9rem', fontWeight: 600, cursor: 'pointer' }}>Set as LIVE (customers can order)</label>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.3rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Fundraiser'}</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--t3)' }}>
          <p style={{ marginBottom: '.5rem', fontWeight: 700 }}>No fundraisers yet</p>
          <p style={{ fontSize: '.9rem' }}>Create your first fundraiser to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {list.map(fr => (
            <div key={fr._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.25rem' }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem' }}>{fr.title}</h3>
                  <span style={{ background: fr.isActive ? 'var(--green-bg)' : 'var(--surface-2)', color: fr.isActive ? 'var(--green)' : 'var(--t3)', borderRadius: 'var(--rpill)', padding: '.18rem .55rem', fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {fr.isActive ? '● LIVE' : '○ PAUSED'}
                  </span>
                </div>
                <p style={{ color: 'var(--t3)', fontSize: '.82rem' }}>
                  {fr.location?.city && `${fr.location.city}, ${fr.location.state} · `}
                  {fr.endDate ? `Orders close ${new Date(fr.endDate).toLocaleDateString()}` : 'No end date set'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gold-dk)' }}>{fr.soldBags || 0}</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Bags</p>
                </div>
                <div style={{ textAlign: 'center', marginLeft: '.5rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>${(fr.totalRevenue || 0).toFixed(0)}</p>
                  <p style={{ fontSize: '.7rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Revenue</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(fr)}>Edit</button>
                <button
                  className={fr.isActive ? 'btn btn-outline btn-sm' : 'btn btn-green btn-sm'}
                  onClick={() => toggleActive(fr)}
                >
                  {fr.isActive ? 'Pause' : 'Go Live'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

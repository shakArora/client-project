/**
 * Admin vendor management page for creating scout accounts and viewing referral performance.
 * Provisions vendors with login credentials and unique codes, with searchable listing per active fundraiser.
 * @author Shivum Arora
 * @date 6/14/2026
 */
import { useState, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { vendorApi, adminApi } from '../lib/api';
import { useActiveFundraiser } from '../lib/useActiveFundraiser';

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

const EMPTY = { name: '', email: '', password: '', referralCode: '' };

export default function AdminVendors() {
  const { fundraiser } = useActiveFundraiser();

  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function loadVendors() {
    setLoading(true);
    vendorApi.list(fundraiser?._id ? { fundraiserId: fundraiser._id } : {})
      .then(r => setVendors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadVendors(); }, [fundraiser?._id]);

  async function handleAddVendor(e) {
    e.preventDefault();
    if (!fundraiser?._id) { setError('No active fundraiser.'); return; }
    setError(''); setSuccess(''); setSaving(true);
    try {
      await adminApi.createVendor({
        name:         form.name,
        email:        form.email,
        password:     form.password,
        fundraiserId: fundraiser._id,
        referralCode: form.referralCode.toUpperCase(),
      });
      setSuccess(`Vendor "${form.name}" created! They can now log in with their email.`);
      setForm(EMPTY);
      setShowForm(false);
      loadVendors();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create vendor.');
    } finally {
      setSaving(false);
    }
  }

  const visible = vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell fundraiser={fundraiser}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,3vw,2rem)', marginBottom: '.25rem' }}>Vendors</h1>
          <p style={{ color: 'var(--t3)', fontSize: '.9rem' }}>{vendors.length} total vendors</p>
        </div>
        <button className="btn btn-gold" onClick={() => { setShowForm(s => !s); setError(''); setSuccess(''); }}>
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r2)', padding: '.7rem .9rem', color: 'var(--green)', fontSize: '.88rem', marginBottom: '1rem' }}>{success}</div>
      )}

      {/* Add vendor form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r4)', padding: '1.3rem', marginBottom: '1.3rem' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '1rem' }}>Add Vendor Account</h2>
          <p style={{ color: 'var(--t3)', fontSize: '.87rem', marginBottom: '1rem' }}>
            Creates a vendor login account and links them to <strong>{fundraiser?.title || 'the active fundraiser'}</strong>.
            Share the email + password with the vendor so they can log in.
          </p>
          {error && <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--r2)', padding: '.65rem .9rem', color: 'var(--red)', fontSize: '.88rem', marginBottom: '.9rem' }}>{error}</div>}
          <form onSubmit={handleAddVendor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
            <Field label="Full Name *"><input placeholder="Alex Johnson" value={form.name} onChange={set('name')} required /></Field>
            <Field label="Email Address *"><input type="email" placeholder="alex@email.com" value={form.email} onChange={set('email')} required /></Field>
            <Field label="Password *"><input type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} /></Field>
            <Field label="Referral Code *">
              <input placeholder="AJ47" value={form.referralCode} onChange={set('referralCode')} required maxLength={6} style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }} />
            </Field>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-dark" disabled={saving || !fundraiser}>{saving ? 'Creating…' : 'Create Vendor'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1.1rem' }}>
        <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r3)', background: '#FFFDF6', padding: '.7rem 1rem', fontSize: '.9rem', width: '100%', maxWidth: 340 }} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Vendor</th><th>Code</th><th>Bags Sold</th><th>Revenue</th><th>Orders</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--t3)' }}>
                  {vendors.length === 0 ? 'No vendors yet, add one above.' : 'No vendors match your search.'}
                </td></tr>
              ) : visible.map(v => {
                const initials = v.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={v._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.1rem' }}>{v.name}</p>
                          <p style={{ color: 'var(--t3)', fontSize: '.78rem' }}>{v.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--gold-dk)', fontWeight: 800, letterSpacing: '.08em', fontSize: '1rem' }}>{v.referralCode}</td>
                    <td style={{ fontWeight: 700 }}>{v.bagsSold}</td>
                    <td style={{ fontWeight: 700 }}>${(v.totalRevenue || 0).toFixed(2)}</td>
                    <td>{v.orderCount}</td>
                    <td>
                      <span style={{ background: v.isActive ? 'var(--green-bg)' : 'var(--surface-2)', color: v.isActive ? 'var(--green)' : 'var(--t3)', borderRadius: 'var(--rpill)', padding: '.2rem .55rem', fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}

/**
 * Renders an address input with live geocoded autocomplete suggestions from the orders API. Requires the user to select a validated result before proceeding with checkout.
 * @name Shivum Arora
 * @date 2026-06-11
 */
import { useState, useEffect, useRef } from 'react';
import { orderApi } from '../lib/api';

/**
 * Address field with validated dropdown — user must pick a geocoded result.
 */
export default function AddressSelect({
  label,
  value = '',
  coords = null,
  onChange,
  placeholder = 'Start typing an address…',
  required = false,
  hint,
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(!!coords?.lat);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value || ''); setValidated(!!coords?.lat); }, [value, coords]);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3 || validated) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await orderApi.searchAddresses(query);
        setSuggestions(data || []);
        setOpen((data || []).length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, validated]);

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    setValidated(false);
    setError('');
    onChange?.({ address: v, coords: null });
  }

  function selectSuggestion(s) {
    setQuery(s.display);
    setValidated(true);
    setOpen(false);
    setError('');
    onChange?.({ address: s.display, coords: { lat: s.lat, lon: s.lon, display: s.display } });
  }

  async function validateCurrent() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await orderApi.validateAddress(query.trim());
      setQuery(data.coords.display);
      setValidated(true);
      onChange?.({ address: data.coords.display, coords: data.coords });
    } catch (err) {
      setValidated(false);
      setError(err.response?.data?.message || 'Address not found. Pick a suggestion from the list.');
      onChange?.({ address: query, coords: null });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: '1rem' }}>
      {label && (
        <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 700, color: 'var(--t2)', marginBottom: '.35rem' }}>
          {label}{required ? ' *' : ''}
        </label>
      )}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => { if (!validated && query.length >= 5) validateCurrent(); }, 200)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{
            flex: 1,
            border: `2px solid ${error ? 'var(--red)' : validated ? '#059669' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '.6rem .75rem',
            fontSize: '.92rem',
            boxSizing: 'border-box',
          }}
        />
        {validated && <span style={{ alignSelf: 'center', color: '#059669', fontSize: '1.1rem' }} title="Verified">✓</span>}
      </div>
      {hint && <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginTop: '.35rem', lineHeight: 1.45 }}>{hint}</p>}
      {loading && <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginTop: '.3rem' }}>Searching…</p>}
      {error && <p style={{ fontSize: '.82rem', color: 'var(--red)', marginTop: '.35rem', fontWeight: 600 }}>{error}</p>}
      {!validated && !error && query.length >= 3 && (
        <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginTop: '.35rem' }}>Select a matching address from the dropdown.</p>
      )}
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 40, left: 0, right: 0, top: '100%', marginTop: 4,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', listStyle: 'none', padding: '.35rem 0', maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', background: 'none',
                  padding: '.6rem .85rem', fontSize: '.86rem', cursor: 'pointer', color: 'var(--t1)',
                }}
              >
                {s.display}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

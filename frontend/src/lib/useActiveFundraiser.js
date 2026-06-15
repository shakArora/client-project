/**
 * React hook that loads the administrator's fundraisers and selects the active or first campaign.
 * Shared by AdminShell pages to scope products, orders, vendors, and routes to the current fundraiser.
 * @author Shivum Arora
 * @date 6/9/2026
 */
import { useState, useEffect } from 'react';
import { fundraiserApi } from './api';

export function useActiveFundraiser() {
  const [fundraiser, setFundraiser] = useState(null);
  const [list,       setList]       = useState([]);
  const [loading,    setLoading]    = useState(true);

  function reload() {
    setLoading(true);
    fundraiserApi.mine()
      .then(r => {
        const items = r.data || [];
        setList(items);
        const active = items.find(f => f.isActive) || items[0] || null;
        setFundraiser(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, []);

  return { fundraiser, setFundraiser, list, loading, reload };
}

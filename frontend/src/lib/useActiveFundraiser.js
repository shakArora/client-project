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

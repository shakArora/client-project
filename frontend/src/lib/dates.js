/** Parse YYYY-MM-DD (or ISO string) as local calendar date — avoids UTC timezone shifts. */
export function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatLocalDate(value, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
  const d = parseLocalDate(value);
  return d ? d.toLocaleDateString('en-US', options) : '';
}

export function endOfLocalDay(value) {
  const d = parseLocalDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Sale status for customer-facing pages. */
export function getSaleStatus(fundraiser) {
  if (!fundraiser) return { closed: true, reason: 'missing' };
  if (!fundraiser.isActive) return { closed: true, reason: 'draft' };

  const now = new Date();
  const start = parseLocalDate(fundraiser.startDate);
  const end = endOfLocalDay(fundraiser.endDate);

  if (start && now < start) {
    return { closed: true, reason: 'not_started', start, end: parseLocalDate(fundraiser.endDate) };
  }
  if (end && now > end) {
    return { closed: true, reason: 'ended', start, end: parseLocalDate(fundraiser.endDate) };
  }
  return { closed: false, start, end: parseLocalDate(fundraiser.endDate) };
}

export function isPastFundraiser(fundraiser) {
  const end = endOfLocalDay(fundraiser?.endDate);
  return !!(end && new Date() > end);
}

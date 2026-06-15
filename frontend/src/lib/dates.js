/**
 * Date helpers that parse and format YYYY-MM-DD values in local time without UTC drift.
 * Includes sale-status logic and formatted date ranges for customer-facing fundraiser pages.
 * @author Shivum Arora
 * @date 6/14/2026
 */
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

export function formatSaleDateRange(fundraiser) {
  if (!fundraiser?.endDate) return '';
  const end = formatLocalDate(fundraiser.endDate);
  if (!fundraiser.startDate) return `Order by ${end}.`;
  const start = formatLocalDate(fundraiser.startDate);
  if (start === end) return `Sale on ${end}.`;
  return `Sale runs ${start} – ${end}.`;
}

export function isPastFundraiser(fundraiser) {
  const end = endOfLocalDay(fundraiser?.endDate);
  return !!(end && new Date() > end);
}

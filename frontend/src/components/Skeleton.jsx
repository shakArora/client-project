/**
 * Exports shimmer skeleton loading primitives and pre-built layouts for dashboard, shop, vendor, driver, and detail pages. Provides accessible placeholder UI during async data fetches.
 * @name Shivum Arora
 * @date 2026-06-11
 */
export function Skeleton({ className = '', style, width, height, circle, rounded }) {
  return (
    <div
      className={`skeleton ${circle ? 'skeleton--circle' : ''} ${rounded ? 'skeleton--rounded' : ''} ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="skeleton-text-block">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="skeleton--line"
          style={{ width: i === lines - 1 ? lastWidth : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-list-row app-card">
          <Skeleton circle width={40} height={40} />
          <div style={{ flex: 1 }}>
            <Skeleton className="skeleton--line" style={{ width: '45%', marginBottom: '.5rem' }} />
            <Skeleton className="skeleton--line skeleton--sm" style={{ width: '70%' }} />
          </div>
          <Skeleton style={{ width: 72, height: 28, borderRadius: 99 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-dashboard-header">
        <div>
          <Skeleton className="skeleton--line" style={{ width: 220, height: 28, marginBottom: '.5rem' }} />
          <Skeleton className="skeleton--line skeleton--sm" style={{ width: 160 }} />
        </div>
        <Skeleton style={{ width: 140, height: 40, borderRadius: 99 }} />
      </div>
      <div className="skeleton-pill-row">
        {[1, 2, 3].map(i => <Skeleton key={i} style={{ width: 100, height: 34, borderRadius: 99 }} />)}
      </div>
      <div className="skeleton-card-grid">
        {[1, 2].map(i => (
          <div key={i} className="app-card skeleton-fundraiser-card">
            <Skeleton style={{ width: '100%', height: 6, borderRadius: 0, marginBottom: '1rem' }} />
            <Skeleton className="skeleton--line" style={{ width: '75%', height: 22, marginBottom: '.75rem' }} />
            <div className="skeleton-stat-row">
              {[1, 2, 3, 4].map(j => (
                <div key={j}>
                  <Skeleton className="skeleton--line" style={{ width: 48, height: 20, marginBottom: '.25rem' }} />
                  <Skeleton className="skeleton--line skeleton--sm" style={{ width: 40 }} />
                </div>
              ))}
            </div>
            <Skeleton style={{ width: '100%', height: 80, marginBottom: '1rem', borderRadius: 10 }} />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <Skeleton style={{ flex: 1, height: 40, borderRadius: 10 }} />
              <Skeleton style={{ width: 90, height: 40, borderRadius: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCustomerShop() {
  return (
    <div className="skeleton-customer">
      <Skeleton style={{ width: 180, height: 32, borderRadius: 99, marginBottom: '1rem' }} />
      <Skeleton style={{ width: '100%', maxWidth: 420, height: 200, borderRadius: 16, marginBottom: '1.25rem' }} />
      <Skeleton className="skeleton--line" style={{ width: '55%', height: 28, marginBottom: '.5rem' }} />
      <SkeletonText lines={2} lastWidth="80%" />
      <div className="skeleton-product-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="app-card skeleton-product-card">
            <Skeleton style={{ width: 'calc(100% + 2.6rem)', height: 165, borderRadius: '12px 12px 0 0', margin: '-1.2rem -1.3rem 1rem' }} />
            <Skeleton className="skeleton--line" style={{ width: '70%', height: 20, marginBottom: '.5rem' }} />
            <Skeleton className="skeleton--line skeleton--sm" style={{ width: '50%', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton style={{ width: 64, height: 24 }} />
              <Skeleton style={{ width: 120, height: 36, borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonFundraiserDetail() {
  return (
    <div className="app-shell" style={{ minHeight: '100vh' }}>
      <div className="admin-topbar">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Skeleton style={{ width: 120, height: 16 }} />
          <Skeleton style={{ width: 80, height: 16 }} />
          <Skeleton style={{ width: 140, height: 18 }} />
        </div>
        <Skeleton style={{ width: 88, height: 34, borderRadius: 10 }} />
      </div>
      <div className="admin-tabbar-skeleton">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} style={{ width: 90, height: 18 }} />)}
      </div>
      <div className="app-main">
        <div className="skeleton-fundraiser-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
          <div>
            <Skeleton className="skeleton--line" style={{ width: 120, height: 22, marginBottom: '1rem' }} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <Skeleton className="skeleton--line skeleton--sm" style={{ width: 100, marginBottom: '.4rem' }} />
                <Skeleton style={{ width: '100%', height: 42, borderRadius: 10 }} />
              </div>
            ))}
          </div>
          <div className="app-card" style={{ padding: '1.2rem' }}>
            <Skeleton className="skeleton--line" style={{ width: '80%', height: 18, marginBottom: '1rem' }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem', alignItems: 'center' }}>
                <Skeleton circle width={18} height={18} />
                <Skeleton className="skeleton--line skeleton--sm" style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonVendorPage() {
  return (
    <div className="skeleton-vendor">
      <Skeleton className="skeleton--line" style={{ width: '70%', height: 28, marginBottom: '.5rem' }} />
      <Skeleton className="skeleton--line skeleton--sm" style={{ width: 140, marginBottom: '1.25rem' }} />
      <div className="skeleton-pill-row" style={{ marginBottom: '1.25rem' }}>
        <Skeleton style={{ width: 110, height: 36, borderRadius: 99 }} />
        <Skeleton style={{ width: 110, height: 36, borderRadius: 99 }} />
      </div>
      <div className="app-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <Skeleton className="skeleton--line skeleton--sm" style={{ width: 100, marginBottom: '.75rem' }} />
        <Skeleton style={{ width: '100%', height: 44, borderRadius: 10, marginBottom: '.75rem' }} />
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Skeleton style={{ width: 90, height: 34, borderRadius: 99 }} />
          <Skeleton style={{ width: 70, height: 34, borderRadius: 99 }} />
        </div>
      </div>
      <div className="app-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Skeleton style={{ width: 160, height: 160, borderRadius: 12, margin: '0 auto 1rem' }} />
        <Skeleton className="skeleton--line" style={{ width: 120, margin: '0 auto' }} />
      </div>
    </div>
  );
}

export function SkeletonDriverRoute() {
  return (
    <div className="app-shell skeleton-driver" style={{ minHeight: '100vh', padding: '1.25rem' }}>
      <Skeleton style={{ width: '100%', height: 56, borderRadius: 12, marginBottom: '1rem' }} />
      <Skeleton className="skeleton--line" style={{ width: '50%', height: 22, marginBottom: '.5rem' }} />
      <Skeleton style={{ width: '100%', height: 8, borderRadius: 99, marginBottom: '1.5rem' }} />
      <SkeletonList rows={4} />
    </div>
  );
}

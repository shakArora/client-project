import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import VendorNav from '../components/VendorNav';
import AppPage from '../components/AppPage';
import { SkeletonVendorPage } from '../components/Skeleton';

export default function VendorCodes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    vendorApi.me()
      .then(r => setVendor(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fundraiser = vendor?.fundraiserId;
  const fundraiserSlug = fundraiser?.slug || fundraiser?._id || '';
  const shopUrl = vendor
    ? `${window.location.origin}/fundraiser/${fundraiserSlug}?ref=${vendor.referralCode}`
    : '';

  function copy() {
    navigator.clipboard?.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: fundraiser?.title, url: shopUrl }).catch(() => {});
    } else {
      copy();
    }
  }

  const name = user?.name?.split(' ')[0] || 'Vendor';
  const endLabel = fundraiser?.endDate
    ? `Ends ${new Date(fundraiser.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : 'Active Fundraiser';
  const seasonLabel = fundraiser?.startDate
    ? new Date(fundraiser.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <AppPage>
      <VendorNav userName={name} />

      <main className="vendor-main">
        {loading ? (
          <SkeletonVendorPage />
        ) : (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem,4vw,2.2rem)', marginBottom: '.2rem', lineHeight: 1.2 }}>
              {fundraiser ? `${fundraiser.title}${seasonLabel ? ` — ${seasonLabel}` : ''}` : 'Your Fundraiser'}
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.88rem', marginBottom: '1.1rem' }}>{endLabel}</p>

            <div className="tab-bar vendor-tab-bar">
              <button type="button" className="active">🔗 My Codes</button>
              <button type="button" onClick={() => navigate('/vendor/sales')}>📊 My Sales</button>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <p className="card-label">Your Shop Link</p>
              <div className="vendor-link-row">
                <input readOnly value={shopUrl} className="vendor-link-input" />
                <div className="vendor-link-actions">
                  <button type="button" className="btn btn-gold btn-sm" onClick={copy}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
                  <button type="button" className="btn btn-dark btn-sm" onClick={share}>Share</button>
                </div>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--t3)', marginTop: '.6rem' }}>
                Share this link — sales are credited to you automatically.
              </p>
            </div>

            <div className="vendor-cards-grid">
              <div className="card">
                <p className="card-label">Your Referral Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,8vw,2.8rem)', fontWeight: 800, color: 'var(--gold-dk)', letterSpacing: '.06em' }}>
                    {vendor?.referralCode || '——'}
                  </span>
                  <button type="button" className="btn btn-dark btn-sm" onClick={share}>Share</button>
                </div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <p className="card-label">QR Code</p>
                <button type="button" onClick={share} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r3)', padding: '1.4rem', display: 'inline-flex', border: 'none', cursor: 'pointer', marginBottom: '.6rem' }}>
                  <svg width="56" height="56" viewBox="0 0 10 10" style={{ imageRendering: 'pixelated' }} aria-hidden>
                    <rect x="0" y="0" width="4" height="4" fill="#3A2510" rx=".5"/>
                    <rect x="1" y="1" width="2" height="2" fill="var(--bg)"/>
                    <rect x="6" y="0" width="4" height="4" fill="#3A2510" rx=".5"/>
                    <rect x="7" y="1" width="2" height="2" fill="var(--bg)"/>
                    <rect x="0" y="6" width="4" height="4" fill="#3A2510" rx=".5"/>
                    <rect x="1" y="7" width="2" height="2" fill="var(--bg)"/>
                    <rect x="5" y="5" width="1" height="1" fill="#3A2510"/>
                    <rect x="7" y="5" width="1" height="1" fill="#3A2510"/>
                    <rect x="6" y="6" width="1" height="1" fill="#3A2510"/>
                    <rect x="8" y="6" width="1" height="1" fill="#3A2510"/>
                    <rect x="5" y="7" width="2" height="1" fill="#3A2510"/>
                    <rect x="8" y="8" width="2" height="2" fill="#3A2510" rx=".3"/>
                    <rect x="5" y="9" width="2" height="1" fill="#3A2510"/>
                  </svg>
                </button>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)' }}>Tap to save or share your QR code</p>
              </div>

              <div className="card">
                <p className="card-label">My Stats</p>
                {[
                  { label: 'Bags Sold', value: vendor?.bagsSold || 0, gold: true },
                  { label: 'Revenue', value: `$${(vendor?.totalRevenue || 0).toFixed(2)}` },
                  { label: 'Orders', value: vendor?.orderCount || 0 },
                ].map(({ label, value, gold }) => (
                  <div key={label} className="vendor-stat-row">
                    <span>{label}</span>
                    <strong style={{ color: gold ? 'var(--gold-dk)' : 'var(--t1)' }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </AppPage>
  );
}

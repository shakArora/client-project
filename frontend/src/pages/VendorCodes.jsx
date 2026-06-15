import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import VendorNav from '../components/VendorNav';
import AppPage from '../components/AppPage';
import { SkeletonVendorPage } from '../components/Skeleton';
import VendorQrCode, { downloadQrPng, getQrSvgElement } from '../components/VendorQrCode';

export default function VendorCodes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef(null);

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

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: fundraiser?.title, url: shopUrl }).catch(() => {});
    } else {
      copy();
    }
  }

  function saveQr() {
    const svg = getQrSvgElement(qrWrapRef.current);
    const code = vendor?.referralCode || 'vendor';
    downloadQrPng(svg, `${code}-shop-qr.png`);
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
              {fundraiser ? `${fundraiser.title}${seasonLabel ? `, ${seasonLabel}` : ''}` : 'Your Fundraiser'}
            </h1>
            <p style={{ color: 'var(--t3)', fontSize: '.88rem', marginBottom: '1.1rem' }}>{endLabel}</p>

            <div className="tab-bar vendor-tab-bar">
              <button type="button" className="active">My Codes</button>
              <button type="button" onClick={() => navigate('/vendor/sales')}>My Sales</button>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <p className="card-label">Your Shop Link</p>
              <div className="vendor-link-row">
                <input readOnly value={shopUrl} className="vendor-link-input" />
                <div className="vendor-link-actions">
                  <button type="button" className="btn btn-gold btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                  <button type="button" className="btn btn-dark btn-sm" onClick={shareLink}>Share</button>
                </div>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--t3)', marginTop: '.6rem' }}>
                Share this link, sales are credited to you automatically.
              </p>
            </div>

            <div className="vendor-cards-grid">
              <div className="card">
                <p className="card-label">Your Referral Code</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,8vw,2.8rem)', fontWeight: 800, color: 'var(--gold-dk)', letterSpacing: '.06em' }}>
                    {vendor?.referralCode || ' -  - '}
                  </span>
                  <button type="button" className="btn btn-dark btn-sm" onClick={shareLink}>Share</button>
                </div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <p className="card-label">QR Code</p>
                <div ref={qrWrapRef} style={{ marginBottom: '.75rem' }}>
                  <VendorQrCode value={shopUrl} size={168} label={`QR code for ${vendor?.referralCode || 'vendor'} shop link`} />
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--t3)', marginBottom: '.65rem' }}>
                  Scan to open your shop with referral tracking.
                </p>
                <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-gold btn-sm" onClick={saveQr}>Download QR</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={shareLink}>Share link</button>
                </div>
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

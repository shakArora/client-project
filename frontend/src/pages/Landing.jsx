import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
  { label: 'About', to: '/about' },
];

const DYNAMIC_WORDS = ['fundraisers', 'deliveries', 'Scout troops', 'mulch sales', 'your community'];

const FEATURES = [
  {
    icon: '🗺',
    title: 'Automatic Route Planning',
    desc: 'Add drivers and bag capacity — Routed distributes every stop optimally.',
    preview: {
      title: 'One-click route generation',
      body: 'Paid orders are geocoded and split across drivers by capacity. No spreadsheets, no manual plotting.',
      visual: 'routes',
    },
  },
  {
    icon: '🔄',
    title: 'Mid-Delivery Re-Routing',
    desc: 'Finished early or running behind? Redistribute remaining stops instantly.',
    preview: {
      title: 'Re-route on delivery day',
      body: 'Delivered stops stay put. Undelivered orders are reassigned to available drivers in seconds.',
      visual: 'reroute',
    },
  },
  {
    icon: '🛒',
    title: 'Beautiful Customer Shop',
    desc: 'A modern fundraiser page customers actually want to order from.',
    preview: {
      title: 'Mobile-first ordering',
      body: 'Swipeable products, direct quantity input, QR codes, and vendor referral tracking built in.',
      visual: 'shop',
    },
  },
  {
    icon: '📊',
    title: 'Live Delivery Tracking',
    desc: 'Watch every stop go from red → yellow → green in real time.',
    preview: {
      title: 'Color-coded progress',
      body: 'Admins see fleet-wide status. Drivers mark stops complete from their phone with map links.',
      visual: 'tracking',
    },
  },
];

const ROLES = [
  { icon: '⚙️', title: 'Administrator', desc: 'Create fundraisers, manage vendors, generate routes, track delivery day.' },
  { icon: '🔗', title: 'Vendor / Scout', desc: 'Share your referral link, set revenue goals, and view every customer order.' },
  { icon: '🚚', title: 'Driver', desc: 'Enter your 6-character code and get an optimized stop-by-stop route.' },
  { icon: '🛒', title: 'Customer', desc: 'Order online from a fundraiser page — no account required.' },
];

const FAQ = [
  { q: 'Who is Routed built for?', a: 'Routed was built for Boy Scouts, Girl Scouts, Cub Scouts, and any youth organization running product fundraisers — especially mulch sales with complex delivery logistics.' },
  { q: 'How does automatic routing work?', a: 'Once orders are placed and drivers are added with their bag capacity, Routed geocodes every delivery address and distributes stops across drivers to maximize load efficiency and minimize travel.' },
  { q: 'Can I re-route during delivery day?', a: 'Yes. If a driver finishes early or falls behind, administrators click Re-Route Mid-Delivery. Completed stops are preserved and remaining stops are redistributed automatically.' },
  { q: 'Do customers need an account?', a: 'No. Customers order directly from your fundraiser link or a vendor QR code. They enter delivery info, pay, and receive a confirmation — all without signing up.' },
  { q: 'How do drivers access their routes?', a: 'Each driver gets a unique 6-character OTP from the administrator. They enter it at routed.system/driver or use a direct link like /driver/ABCD12.' },
  { q: 'How do I get an admin account?', a: 'Admin accounts are created by request. Visit our Request Access page and email the team — we will set up your account.' },
];

const TRUST_ORGS = [
  'Boy Scouts of America', 'Girl Scouts', 'Cub Scouts', 'Youth Sports',
  'Community Troops', 'School Fundraisers', 'Local Charities', 'Scout Councils',
];

const DASH_STOPS = [
  { name: 'Sarah M.', addr: '142 Oak Lane', status: 'delivered' },
  { name: 'James T.', addr: '88 Maple Dr', status: 'current' },
  { name: 'Linda K.', addr: '301 Pine Ct', status: 'pending' },
  { name: 'Robert H.', addr: '55 Elm St', status: 'pending' },
];

const STOP_COLORS = { delivered: '#4E6D38', current: '#C9A862', pending: '#BF3535' };

function FeatureVisual({ type }) {
  if (type === 'routes') {
    return (
      <div className="landing-dash-stops">
        {DASH_STOPS.map((s, i) => (
          <div key={i} className="landing-dash-stop">
            <span className="landing-dash-stop-dot" style={{ background: STOP_COLORS[s.status] }} />
            <div>
              <div className="landing-dash-stop-name">{s.name}</div>
              <div className="landing-dash-stop-addr">{s.addr}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'tracking') {
    return (
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
        {['Pending', 'In Progress', 'Delivered'].map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem', color: 'var(--lp-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: ['#BF3535','#C9A862','#4E6D38'][i] }} />
            {l}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function Landing() {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [dashTilt, setDashTilt] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [wordFade, setWordFade] = useState(true);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [featureFade, setFeatureFade] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const dashRef = useRef(null);

  useEffect(() => {
    setLoaded(true);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('animate-in'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      if (dashRef.current) {
        const rect = dashRef.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const start = vh * 0.85;
        const end = vh * 0.25;
        if (rect.top >= start) setDashTilt(0);
        else if (rect.top <= end) setDashTilt(14);
        else setDashTilt(((start - rect.top) / (start - end)) * 14);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setWordFade(false);
      setTimeout(() => { setWordIdx(i => (i + 1) % DYNAMIC_WORDS.length); setWordFade(true); }, 280);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFeatureFade(false);
      setTimeout(() => { setFeatureIdx(i => (i + 1) % FEATURES.length); setFeatureFade(true); }, 300);
    }, 6000);
    return () => clearInterval(t);
  }, [featureIdx]);

  const activeFeature = FEATURES[featureIdx];

  return (
    <div className={`landing-page ${loaded ? 'landing-page--loaded' : ''}`}>
      <SiteNav links={NAV_LINKS} actionLabel="Login" actionTo="/login" />

      {/* Hero */}
      <section className="landing-hero">
        <div
          className="landing-hero-bg"
          style={{
            backgroundImage: 'url(/hero-landscape.png)',
            transform: `translateY(${scrollY * 0.35}px) scale(1.08)`,
          }}
        />
        <div className="landing-hero-overlay" />

        <div
          className="landing-hero-content"
          style={{ transform: `translateY(${scrollY * 0.12}px)` }}
        >
          <div className="landing-eyebrow stagger-reveal" style={{ animationDelay: '0ms' }}>
            <span className="landing-eyebrow-dot" />
            Community Fundraising Platform
          </div>

          <h1 className="landing-headline">
            <span className="stagger-reveal" style={{ animationDelay: '80ms', display: 'block' }}>
              Run better{' '}
              <span className={`landing-word ${wordFade ? '' : 'landing-word--fade'}`}>
                <em>{DYNAMIC_WORDS[wordIdx]}</em>
              </span>
            </span>
            <span className="stagger-reveal" style={{ animationDelay: '160ms', display: 'block' }}>
              from sale to delivery
            </span>
          </h1>

          <p className="landing-sub stagger-reveal" style={{ animationDelay: '240ms' }}>
            Designed for Scout troops — built for any organization. Sell online, track orders,
            and auto-generate optimized delivery routes. Zero spreadsheets.
          </p>

          <div className="landing-cta-row stagger-reveal" style={{ animationDelay: '320ms' }}>
            <Link to="/shop" className="glass-btn glass-btn--gold">
              Fund Fundraiser <ArrowRight size={16} />
            </Link>
            <Link to="/driver" className="glass-btn">
              Enter Driver Code <ArrowRight size={16} />
            </Link>
          </div>

          {/* Dashboard mockup */}
          <div className="landing-dashboard-wrap stagger-reveal" style={{ animationDelay: '420ms' }} ref={dashRef}>
            <div
              className="landing-dashboard"
              style={{ transform: `rotateX(${dashTilt}deg)`, transformStyle: 'preserve-3d' }}
            >
              <div className="landing-dashboard-bar">
                <span className="landing-dashboard-dot" style={{ background: '#ff5f57' }} />
                <span className="landing-dashboard-dot" style={{ background: '#febc2e' }} />
                <span className="landing-dashboard-dot" style={{ background: '#28c840' }} />
                <span style={{ marginLeft: '.5rem', fontSize: '.72rem', color: 'var(--lp-muted)' }}>Routed Admin — Delivery Day</span>
              </div>
              <div className="landing-dashboard-body">
                <div className="landing-dash-sidebar">
                  {['Details', 'Products', 'Vendors', 'Orders', 'Drivers'].map((item, i) => (
                    <div key={item} className={`landing-dash-nav-item ${item === 'Drivers' ? 'active' : ''}`}>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="landing-dash-main">
                  <div className="landing-dash-title">Driver Routes — 4 stops assigned</div>
                  <div className="landing-dash-stops">
                    {DASH_STOPS.map((s, i) => (
                      <div key={i} className="landing-dash-stop">
                        <span className="landing-dash-stop-dot" style={{ background: STOP_COLORS[s.status] }} />
                        <div style={{ flex: 1 }}>
                          <div className="landing-dash-stop-name">{s.name}</div>
                          <div className="landing-dash-stop-addr">{s.addr} · 4 bags</div>
                        </div>
                        <span style={{ fontSize: '.65rem', color: STOP_COLORS[s.status], fontWeight: 700, textTransform: 'uppercase' }}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="landing-trust">
        <p className="landing-trust-label">Trusted by troops and organizations nationwide</p>
        <div className="landing-marquee">
          <div className="landing-marquee-content">
            {[...TRUST_ORGS, ...TRUST_ORGS].map((org, i) => (
              <span key={i} className="landing-marquee-item">{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section animate-on-scroll">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="landing-section-label" style={{ justifyContent: 'center' }}>
            <span className="landing-section-label-dot" /> Platform
          </div>
          <h2 className="landing-section-title">
            Everything your fundraiser <span className="landing-gradient-text">needs</span>
          </h2>
          <p className="landing-section-sub">
            From the first online order to the last bag delivered — Routed handles the hard parts.
          </p>
        </div>

        <div className="landing-features">
          <div className="landing-feature-list">
            {FEATURES.map((f, i) => (
              <button
                key={i}
                type="button"
                className={`landing-feature-btn ${featureIdx === i ? 'active' : ''}`}
                onClick={() => {
                  setFeatureFade(false);
                  setTimeout(() => { setFeatureIdx(i); setFeatureFade(true); }, 200);
                }}
              >
                <span className="landing-feature-icon">{f.icon}</span>
                <div>
                  <div className="landing-feature-title">{f.title}</div>
                  <div className="landing-feature-desc">{f.desc}</div>
                </div>
                {featureIdx === i && (
                  <div className="landing-feature-progress">
                    <div key={featureIdx} className="landing-feature-progress-bar" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="landing-feature-preview">
            <div
              className="landing-feature-card"
              style={{ opacity: featureFade ? 1 : 0, transform: featureFade ? 'translateY(0)' : 'translateY(12px)' }}
            >
              <div className="landing-feature-card-inner">
                <h3>{activeFeature.preview.title}</h3>
                <p>{activeFeature.preview.body}</p>
                <FeatureVisual type={activeFeature.preview.visual} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works / roles */}
      <section id="how-it-works" className="landing-section animate-on-scroll">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="landing-section-label" style={{ justifyContent: 'center' }}>
            <span className="landing-section-label-dot" /> Roles
          </div>
          <h2 className="landing-section-title">
            Built for <span className="landing-gradient-text">everyone</span> involved
          </h2>
          <p className="landing-section-sub">
            Four user types. One seamless platform. No confusion on delivery day.
          </p>
        </div>
        <div className="landing-roles">
          {ROLES.map((r, i) => (
            <div key={i} className="landing-role-card">
              <div className="landing-role-icon">{r.icon}</div>
              <h3 className="landing-role-title">{r.title}</h3>
              <p className="landing-role-desc">{r.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/help#guide" className="glass-btn">
            Read the full guide <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section animate-on-scroll">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="landing-section-label" style={{ justifyContent: 'center' }}>
            <span className="landing-section-label-dot" /> FAQ
          </div>
          <h2 className="landing-section-title">
            Got <span className="landing-gradient-text">questions</span>?
          </h2>
        </div>
        <div className="landing-faq-list">
          {FAQ.map((item, i) => (
            <div key={i} className={`landing-faq-item ${openFaq === i ? 'open' : ''}`}>
              <button type="button" className="landing-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}
                <ChevronDown size={18} className="landing-faq-chevron" />
              </button>
              <div className="landing-faq-a">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section animate-on-scroll">
        <div
          className="landing-cta-bg"
          style={{ backgroundImage: 'url(/hero-landscape.png)' }}
        />
        <div className="landing-cta-overlay" />
        <div className="landing-cta-inner">
          <div className="landing-cta-pill">
            <span className="landing-eyebrow-dot" />
            Start your next fundraiser
          </div>
          <h2 className="landing-section-title" style={{ marginBottom: '1rem' }}>
            Ready to ditch the spreadsheets?
          </h2>
          <p className="landing-section-sub" style={{ marginBottom: '2rem' }}>
            Join troops already running smoother fundraisers with Routed.
          </p>
          <div className="landing-cta-row">
            <Link to="/request-access" className="glass-btn glass-btn--gold">
              Request Admin Access <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div className="landing-footer-brand">Routed<span>.</span></div>
            <p className="landing-footer-tagline">
              Community fundraising from first sale to final delivery. Built for Scout troops, designed for everyone.
            </p>
          </div>
          <div className="landing-footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <Link to="/help">Help Center</Link>
            <Link to="/shop">Shop</Link>
          </div>
          <div className="landing-footer-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/request-access">Request Access</Link>
            <a href="mailto:contact.routed@gmail.com">Contact</a>
          </div>
          <div className="landing-footer-col">
            <h4>Portals</h4>
            <Link to="/login">Login</Link>
            <Link to="/driver">Driver Portal</Link>
            <Link to="/request-access">Request Access</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Routed. All rights reserved.</span>
          <div className="landing-footer-links">
            <Link to="/help">Help</Link>
            <Link to="/about">About</Link>
            <a href="mailto:contact.routed@gmail.com">contact.routed@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';

const ROLES = [
  {
    id: 'admin',
    icon: '⚙️',
    role: 'Administrator',
    steps: [
      { title: 'Create a Fundraiser', body: 'Log in and click "New Fundraiser" on your dashboard. Fill in the name, location, sale start/end dates, and delivery date. Upload a cover image and add contact info.' },
      { title: 'Add Products', body: 'Go to the Products tab and add each item for sale (e.g. Black Mulch, Red Mulch). Set the price per bag and choose an emoji or image.' },
      { title: 'Create Vendor Accounts', body: 'In the Vendors tab, create accounts for each Scout selling on behalf of the fundraiser. Each vendor receives a unique referral code to share with customers.' },
      { title: 'Publish the Fundraiser', body: 'Once all checklist items are complete (dates, contact, products), toggle the fundraiser to Live so customers can place orders.' },
      { title: 'View Orders', body: 'Monitor all incoming orders in the Orders tab. Confirm payment, update statuses, and issue refunds if needed.' },
      { title: 'Add Drivers & Generate Routes', body: 'In the Drivers tab, add each driver with their bag capacity. On delivery day, click "Generate Routes" and Routed automatically assigns stops to each driver based on their capacity and proximity.' },
      { title: 'Re-Route Mid-Delivery', body: 'If a driver finishes early or runs behind, click "Re-Route Mid-Delivery" to redistribute remaining undelivered stops among all available drivers.' },
      { title: 'Track Delivery Progress', body: 'Each driver card shows a color-coded stop list: red = pending, yellow = current stop, green = delivered. Watch your entire fleet from one screen.' },
    ],
  },
  {
    id: 'vendor',
    icon: '🔗',
    role: 'Vendor / Scout',
    steps: [
      { title: 'Log In', body: 'Use the username and password provided by your administrator to log in to Routed.' },
      { title: 'Share Your Code & Link', body: 'Go to My Codes to find your unique referral code and shop link. Share the QR code or link with neighbors so their orders are credited to you.' },
      { title: 'Set a Revenue Goal', body: 'On the My Sales page, enter a dollar goal. Routed tracks your progress with a live progress bar so you always know how close you are.' },
      { title: 'View Your Customers', body: 'See every order placed through your code — customer name, address, items ordered, and total spent. Tap any row for full order details.' },
      { title: 'Contact the Administrator', body: 'Use the contact section at the bottom of My Sales to reach your fundraiser organizer by phone or email if you have any questions.' },
    ],
  },
  {
    id: 'customer',
    icon: '🛒',
    role: 'Customer',
    steps: [
      { title: 'Find Your Fundraiser', body: 'Use the link or QR code your Scout shared, or navigate to the fundraiser page directly. No account required to order.' },
      { title: 'Pick Your Products', body: 'Browse the available products, enter the quantity you want for each, and tap "Add to Cart".' },
      { title: 'Enter Delivery Info', body: 'Provide your delivery address, phone number, and any special delivery notes. We\'ll geocode your address for accurate routing.' },
      { title: 'Place & Pay', body: 'Review your order and confirm. Pay online via the checkout flow, or select "Pay at Delivery" to settle up when your mulch arrives.' },
      { title: 'Confirmation', body: 'You\'ll see an order confirmation with your estimated delivery date. Contact the admin with the info on the confirmation page if you need to make changes.' },
    ],
  },
  {
    id: 'driver',
    icon: '🚚',
    role: 'Driver',
    steps: [
      { title: 'Get Your Code', body: 'The administrator will give you a unique 6-character one-time code (OTP) before delivery day.' },
      { title: 'Access Your Route', body: 'Go to the Driver Portal at Routed/driver and enter your 6-character code — or use the direct link Routed/driver/[YOUR-CODE] to jump straight to your route.' },
      { title: 'Follow the Stop List', body: 'Stops are listed in delivery order. The current stop is highlighted in yellow. Tap Google Maps, Apple Maps, or Waze to open navigation for that address.' },
      { title: 'Mark Stops Complete', body: 'After each delivery, tap "Mark Delivered" at the bottom of the screen. The stop turns green and the next stop becomes your current stop automatically.' },
      { title: 'Finish Your Route', body: 'Once all stops are marked delivered, you\'ll see a completion screen. Your administrator can see your progress in real time.' },
    ],
  },
];

const FAQ = [
  { q: 'Can I order without creating an account?', a: 'Yes. Customers never need an account. Just follow the fundraiser link and place your order.' },
  { q: 'How do I get an administrator account?', a: 'Admin accounts are created by request only. Visit the Request Access page and email us — we\'ll set up your account.' },
  { q: 'Can routes be changed after delivery starts?', a: 'Yes. Administrators can click "Re-Route Mid-Delivery" at any time. Already-delivered stops stay with their driver; undelivered stops are redistributed.' },
  { q: 'What happens if I lose my driver code?', a: 'Contact your administrator to get the code re-shared. The administrator can see all OTPs in the Drivers tab.' },
  { q: 'How are delivery routes optimized?', a: 'Routed distributes orders by driver capacity and geocoded address coordinates. Each driver is assigned the maximum load they can carry in the fewest stops.' },
  { q: 'Is my payment information stored?', a: 'No. Routed never stores credit card or banking data. Payment processing is handled by a secure third-party processor.' },
];

export default function Help() {
  const [open, setOpen] = useState(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#guide') {
      document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="landing-page marketing-dark">
      <SiteNav subpage actionLabel="Login" actionTo="/login" />

      <main className="marketing-page-main">
        <header
          id="guide"
          className="marketing-page-hero marketing-page-hero--left"
          style={{ scrollMarginTop: '5.5rem' }}
        >
          <div className="landing-eyebrow">
            <span className="landing-eyebrow-dot" />
            Help Center
          </div>
          <h1>How does Routed work?</h1>
          <p>
            Routed is built for four types of users. Find your role below for a step-by-step guide.
          </p>
        </header>

        {ROLES.map(({ id, icon, role, steps }) => (
          <section key={id} className="mkt-role-section">
            <div className="mkt-role-header">
              <div className={`mkt-role-badge mkt-role-badge--${id}`}>{icon}</div>
              <h2 className={`mkt-role-title mkt-role-title--${id}`}>{role}</h2>
            </div>
            <div className="mkt-step-grid">
              {steps.map((s, i) => (
                <div key={i} className="mkt-glass-card mkt-step-card">
                  <div className={`mkt-step-num mkt-step-num--${id}`}>{i + 1}</div>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mkt-section-title">Frequently Asked Questions</h2>
          <div className="mkt-faq">
            {FAQ.map(({ q, a }, i) => (
              <div key={i} className="mkt-faq-item">
                <button
                  type="button"
                  className="mkt-faq-btn"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span>{q}</span>
                  <span className={`mkt-faq-chevron ${open === i ? 'mkt-faq-chevron--open' : ''}`}>▾</span>
                </button>
                {open === i && (
                  <div className="mkt-faq-answer">{a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mkt-cta-row" style={{ marginTop: '2.5rem' }}>
          <Link to="/login" className="glass-btn glass-btn--gold">
            Log In <ArrowRight size={16} />
          </Link>
          <Link to="/request-access" className="glass-btn">
            Request Admin Access <ArrowRight size={16} />
          </Link>
          <Link to="/about" className="glass-btn">
            About Routed <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  );
}

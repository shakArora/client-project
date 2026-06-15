/**
 * This is the home page for the Routed Application, which contains navigation to other pages and logins. This page also describes our focus and mission in creating this app. 
 * @author Shivum Arora
 * @date 5/27/2026
 */

import './App.css'

function App() {
  return (
    <div className="site">
      <header className="top-nav">
        <a className="brand" href="/">
          ROUTED
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#contact">Contact</a>
        </nav>
        <button type="button" className="nav-cta">
          Start now
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Fundraising, routed better</p>
          <h1>Connect fundraisers, customers, and drivers in one clean flow.</h1>
          <p className="hero-text">
            Routed helps organizations launch campaigns, manage fulfillment, and
            keep supporters updated. Fast setup, clear tracking, and a
            professional experience on every device.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary">
              Explore campaigns
            </button>
            <button type="button" className="btn btn-secondary">
              Driver portal
            </button>
          </div>

          <div className="metrics">
            <article>
              <strong>2,400+</strong>
              <span>Campaigns launched</span>
            </article>
            <article>
              <strong>$6.8M</strong>
              <span>Raised with Routed</span>
            </article>
            <article>
              <strong>97%</strong>
              <span>On-time delivery rate</span>
            </article>
          </div>
        </section>

        <section id="features" className="features">
          <h2>Everything needed to run great campaigns</h2>
          <div className="feature-grid">
            <article className="card">
              <h3>Smart campaign pages</h3>
              <p>
                Publish modern fundraiser pages with a polished checkout and
                live progress that keeps supporters engaged.
              </p>
            </article>
            <article className="card">
              <h3>Route-aware fulfillment</h3>
              <p>
                Organize deliveries by zone and driver, reducing confusion and
                making handoffs smooth for your team.
              </p>
            </article>
            <article className="card">
              <h3>Clear communication</h3>
              <p>
                Share status updates with customers and volunteers so everyone
                knows what is happening and what comes next.
              </p>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="steps">
          <h2>How Routed works</h2>
          <div className="step-grid">
            <article>
              <span>01</span>
              <h3>Create your fundraiser</h3>
              <p>Set goals, upload details, and customize your campaign page.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Share and accept orders</h3>
              <p>Collect support with a simple, mobile-friendly checkout flow.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Assign drivers and deliver</h3>
              <p>Coordinate routes and close out campaigns with confidence.</p>
            </article>
          </div>
        </section>
      </main>

      <footer id="contact" className="footer">
        <p>Ready to launch your next fundraiser with Routed?</p>
        <button type="button" className="btn btn-primary">
          Get started
        </button>
      </footer>
    </div>
  )
}


export default App

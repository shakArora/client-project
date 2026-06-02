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


/* 
usage: getCoordinates('1600 Amphitheatre Parkway, Mountain View, CA').then(coords => {
    console.log(coords); 
});

{ lat: 37.4224824, lon: -122.0856086 }
*/

async function getCoordinates(address) {
    const url = `https://openstreetmap.org{encodeURIComponent(address)}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'YourAppName (your-email@example.com)' } // Required for Nominatim
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        } else {
            throw new Error('Address not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function parseAddr(coords) {
  if (!coords) return 'Invalid coordinates';
  return `${coords.lat},${coords.lon}`;
}

/* FROM GEMINI uses OSRM (we should self-host it)
 * It's OSS, so no api keys
 */
// origin and destination parameter format: '-95.3698,29.7499'
async function getOSRMRoute(origin, destination) {
    // Coordinates: [longitude, latitude]
    
    const url = `https://project-osrm.org{origin};${destination}?overview=false`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 'Ok') {
            const meters = data.routes[0].distance;
            const seconds = data.routes[0].duration;
            
            console.log(`Distance: ${(meters / 1609.34).toFixed(2)} miles`); // Convert meters to miles
            console.log(`Drive Time: ${(seconds / 60).toFixed(0)} minutes`);
            return {
              dist: (meters / 1609.34).toFixed(2),
              driveTime: (seconds / 60).toFixed(0)
            };
        }
    } catch (error) {
        console.error('Error fetching route:', error);
    }
}

// GET ADDRESS LIST -> PARSE EXCEL TO CSV TO JSON
// addresses is a list of addresses
// weights is the amount of mulch each house needs
async function mapBuilder(addresses, weights) {
  let coors = [];
  let i = 0;
  for (const addr of addresses) {
    getCoordinates(addr).then(coords => {
      var latlong = coords;
    });
    latlong = parseAddr(latlong); 
    coors.push({latlong, weights[i]});
    i++;
  }
  return coors; 
}

// takes in the resulting map from mapBuilder(addresses, weights); [{address, howMuchWeightNeeded}....]
// and the amount each car can carry in an array parsed from JSON
// get where each car should go
async function cluster(locations, cars) {
  locations.sort((a, b) => b.weight - a.weight);
  const assignments = {};
  for (let i = 0; i < cars.length; i++) {
    assignments[`Car_${i}`] = { capacity: cars[i], assignedTo: [], remainingCapacity: cars[i] };
  }
  for (const loc of locations) {
    let assigned = false;
    for (let carId in assignments) {
      const car = assignments[carId];
      if (loc.weight <= car.remainingCapacity) {
        car.assignedTo.push({ address: loc.address, weight: loc.weight });
        car.remainingCapacity -= loc.weight;
        assigned = true;
        break; 
      }
    }
    
    if (!assigned) {
      console.warn(`Warning: Location "${loc.address}" requires ${loc.weight}, which exceeds any individual car's capacity.`);
    }
  }

  return assignments;
}

export default App

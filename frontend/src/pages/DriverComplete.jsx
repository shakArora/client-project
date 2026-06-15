/**
 * Renders the driver route completion celebration screen with static delivery stats. Shown after all stops on a route have been marked delivered.
 * @name Shivum Arora
 * @date 2026-06-05
 */
import { Link } from 'react-router-dom';

export default function DriverComplete() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--dark)', display:'flex', flexDirection:'column' }}>
      {/* Minimal header */}
      <div style={{ padding:'1.4rem 1.6rem .6rem', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
        <Link to="/" style={{ fontFamily:'var(--serif)', fontSize:'1.6rem', fontWeight:800, color:'#fff', textDecoration:'none' }}>
          Routed<span style={{ color:'var(--gold)' }}>.</span>
        </Link>
      </div>

      <main style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2.5rem 1.5rem', textAlign:'center' }}>
        {/* Flag emoji */}
        <div style={{ fontSize:'4rem', lineHeight:1, marginBottom:'1rem' }}>🏁</div>

        <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,5vw,3rem)', color:'#fff', marginBottom:'.65rem' }}>
          Route Complete!
        </h1>

        <p style={{ color:'#b8a890', lineHeight:1.6, maxWidth:380, marginBottom:'2rem', fontSize:'.93rem' }}>
          Outstanding work, Jake! All stops have been delivered.
          The admin dashboard has been updated automatically.
        </p>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.85rem', maxWidth:420, marginBottom:'2.5rem' }}>
          {[
            { value:'49', label:'Stops' },
            { value:'83', label:'Bags' },
            { value:'3h 12m', label:'Time' },
          ].map(({ value, label }) => (
            <div key={label} style={{
              background:'rgba(255,255,255,.07)',
              border:'1px solid rgba(255,255,255,.1)',
              borderRadius:'var(--r3)',
              padding:'.9rem',
              textAlign:'center',
            }}>
              <p style={{ fontFamily:'var(--serif)', fontSize:'1.7rem', fontWeight:800, color:' var(--gold-lt)', lineHeight:1, marginBottom:'.2rem' }}>{value}</p>
              <p style={{ color:'#b8a890', fontSize:'.8rem', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>{label}</p>
            </div>
          ))}
        </div>

        <Link to="/" className="btn btn-outline-lt btn-lg" style={{ textTransform:'uppercase', letterSpacing:'.06em', minWidth:200 }}>
          Sign Out
        </Link>
      </main>
    </div>
  );
}

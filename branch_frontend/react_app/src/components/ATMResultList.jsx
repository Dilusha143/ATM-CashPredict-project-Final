// src/components/ATMResultList.jsx
import { fmtINR, ZONE_COLORS, ATM_ZONES } from '../utils/format'

export default function ATMResultList({ predictions }) {
  if (!predictions?.length) return null
  const maxP50 = Math.max(...predictions.map(p => p.predicted))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {predictions.map((p, i) => {
        const pct  = Math.round(p.predicted / maxP50 * 100)
        const zone = ATM_ZONES[p.atm] || 'unknown'
        const zc   = ZONE_COLORS[zone] || { bg:'var(--bg4)', text:'var(--text2)' }

        return (
          <div key={p.atm} style={{ display:'grid', gridTemplateColumns:'170px 1fr 90px 90px', gap:14, alignItems:'center', padding:'14px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', transition:'border-color .2s' }}
            onMouseOver={e=>e.currentTarget.style.borderColor='var(--border2)'}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', letterSpacing:'-0.01em', margin:0 }}>{p.atm}</p>
              <span style={{ display:'inline-block', marginTop:4, fontSize:12, fontWeight:600, padding:'2px 7px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.05em', background:zc.bg, color:zc.text }}>{zone}</span>
            </div>
            <div>
              <div style={{ height:6, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,var(--accent),#059669)', borderRadius:3, transition:'width .7s cubic-bezier(.4,0,.2,1)' }}/>
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{pct}% of network peak</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:500, color:'var(--text)', margin:0 }}>{fmtINR(p.predicted)}</p>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>P50 estimate</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:500, color:'var(--blue)', margin:0 }}>{fmtINR(p.p90)}</p>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>P90 buffer</p>
            </div>
          </div>
        )
      })}
      <p style={{ fontSize:13, color:'var(--text3)', textAlign:'center', marginTop:4 }}>P50 = best estimate · P90 = with +20% safety buffer</p>
    </div>
  )
}

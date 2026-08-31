// src/components/ConfidenceBands.jsx
import { fmtINR } from '../utils/format'

export default function ConfidenceBands({ predictions }) {
  if (!predictions?.length) return null
  const maxP90 = Math.max(...predictions.map(p => p.p90))

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:24 }}>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, color:'var(--text)', margin:0 }}>Confidence bands</h2>
        <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>P10 conservative · P50 best estimate · P90 safety buffer</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {predictions.map(p => {
          const w50 = Math.round(p.predicted / maxP90 * 100)
          const w90 = Math.round(p.p90 / maxP90 * 100)
          return (
            <div key={p.atm} style={{ display:'grid', gridTemplateColumns:'120px 1fr 70px', gap:10, alignItems:'center' }}>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', margin:0 }}>{p.atm.replace(' ATM','')}</p>
              <div style={{ position:'relative', height:18 }}>
                <div style={{ position:'absolute', left:0, height:'100%', width:`${w90}%`, background:'rgba(96,165,250,0.2)', borderRadius:3 }}/>
                <div style={{ position:'absolute', left:0, height:'100%', width:`${w50}%`, background:'linear-gradient(90deg,var(--accent),#059669)', borderRadius:3 }}/>
              </div>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text)', textAlign:'right', margin:0 }}>{fmtINR(p.predicted)}</p>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:14 }}>
        {[{color:'linear-gradient(90deg,var(--accent),#059669)',label:'P50 estimate'},{color:'rgba(96,165,250,0.35)',label:'P90 buffer'}].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:20, height:4, borderRadius:2, background:l.color }}/>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

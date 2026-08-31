// src/components/ModelStats.jsx
import { useState, useEffect } from 'react'
import { fetchAtmStats } from '../utils/api'
import { fmtINR, ZONE_COLORS, ATM_ZONES } from '../utils/format'

// NOTE: performance numbers below (sMAPE, baseline, improvement, MAE, and
// which algorithm won) all come live from GET /atm/stats, which reads
// branch_model/evaluation/model_results.json + saved_models/model_manifest.json
// on the backend. Nothing here is hard-coded -- three ATMs currently run on
// XGBoost and two (Christ College, Mount Road) run on Random Forest, per the
// per-ATM model selection in branch_model/training/trainer.py.

export default function ModelStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchAtmStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const atms = stats ? Object.keys(stats) : []

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, color:'var(--text)', margin:0 }}>ATM statistics & model performance</h2>
        <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>Best-performing model per ATM vs 7-day rolling baseline (sMAPE)</p>
      </div>
      {loading && <p style={{ fontSize:13, color:'var(--text3)' }}>Loading live model stats…</p>}
      {!loading && !stats && <p style={{ fontSize:13, color:'var(--rose)' }}>Could not load model stats from the backend.</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {atms.map((atm) => {
          const mr   = stats[atm]
          const zone = ATM_ZONES[atm] || mr.zone || 'unknown'
          const zc   = ZONE_COLORS[zone] || { bg:'var(--bg4)', text:'var(--text2)' }
          const imp  = mr.improvement > 0
          const modelColor = mr.model === 'Random Forest' ? 'var(--violet, #8b5cf6)' : 'var(--accent)'
          return (
            <div key={atm} style={{ padding:'14px 16px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{atm}</span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.05em', background:zc.bg, color:zc.text }}>{zone}</span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.05em', background:`${modelColor}22`, color:modelColor }}>{mr.model}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:600, fontFamily:'var(--ff-mono)', color: imp?'var(--accent)':'var(--rose)' }}>{imp?'▲ +':'▼ '}{Math.abs(mr.improvement).toFixed(1)}%</span>
              </div>
              {[{label:`${mr.model} sMAPE`, val:mr.smape, color:modelColor},{label:'Baseline sMAPE', val:mr.baseline, color:'var(--text3)'}].map(b=>(
                <div key={b.label} style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:12, color:'var(--text3)' }}>{b.label}</span>
                    <span style={{ fontSize:12, fontFamily:'var(--ff-mono)', color:b.color }}>{b.val}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${b.val}%`, background:b.color, borderRadius:3 }}/>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', gap:16, marginTop:10 }}>
                <div><p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>MAE</p><p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text2)', margin:0 }}>{fmtINR(mr.mae)}</p></div>
                <div><p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>Avg daily</p><p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text2)', margin:0 }}>{fmtINR(mr.mean)}</p></div>
                <div><p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>Max</p><p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text2)', margin:0 }}>{fmtINR(mr.max)}</p></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

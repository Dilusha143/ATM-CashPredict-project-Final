// src/components/MissingDates.jsx
import { useState, useEffect } from 'react'
import { fetchMissingDates } from '../utils/api'
import { ATM_MISSING } from '../utils/format'

const ATMS = ['Airport ATM','Big Street ATM','Christ College ATM','KK Nagar ATM','Mount Road ATM']

export default function MissingDates() {
  const [atm,     setAtm]     = useState('Airport ATM')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchMissingDates(atm).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false))
  }, [atm])

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, color:'var(--text)', margin:0 }}>Missing dates analysis</h2>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>731 dates filled via forward-fill imputation</p>
        </div>
        <select value={atm} onChange={e=>setAtm(e.target.value)} style={{ padding:'7px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text)', fontSize:14, cursor:'pointer', outline:'none', appearance:'none' }}>
          {ATMS.map(a=><option key={a} value={a}>{a} ({ATM_MISSING[a]})</option>)}
        </select>
      </div>

      {/* Clickable ATM summary pills */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
        {ATMS.map(a=>(
          <div key={a} onClick={()=>setAtm(a)} style={{ padding:'10px 8px', textAlign:'center', background: atm===a?'var(--accent-dim)':'var(--bg3)', border:`1px solid ${atm===a?'rgba(110,231,183,0.3)':'var(--border)'}`, borderRadius:'var(--r)', cursor:'pointer', transition:'all .15s' }}>
            <p style={{ fontFamily:'var(--ff-mono)', fontSize:18, fontWeight:500, color: atm===a?'var(--accent)':'var(--text)', lineHeight:1, margin:0 }}>{ATM_MISSING[a]}</p>
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:4, letterSpacing:'0.04em' }}>{a.replace(' ATM','')}</p>
          </div>
        ))}
      </div>

      <div style={{ padding:'10px 14px', borderRadius:'var(--r)', background:'var(--accent-dim)', border:'1px solid rgba(110,231,183,0.2)', fontSize:14, color:'var(--accent)', marginBottom:14, display:'flex', gap:8 }}>
        <span>ℹ</span>
        <span>These dates had no transaction records. They were filled using the previous day's values.</span>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {Array.from({length:12}).map((_,i)=><div key={i} className="skeleton" style={{ width:90, height:26 }}/>)}
        </div>
      ) : !data ? (
        <p style={{ fontSize:14, color:'var(--text3)' }}>Connect to Flask API to load missing dates.</p>
      ) : (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:220, overflowY:'auto', paddingRight:4 }}>
          {data.dates.map(d=>(
            <span key={d} style={{ fontFamily:'var(--ff-mono)', fontSize:13, padding:'4px 10px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)' }}>{d}</span>
          ))}
        </div>
      )}
    </div>
  )
}

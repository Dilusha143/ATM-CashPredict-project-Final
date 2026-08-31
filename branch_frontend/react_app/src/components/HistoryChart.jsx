// src/components/HistoryChart.jsx
import { useState, useEffect } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { fetchHistory } from '../utils/api'
import { fmtINR, fmtINRFull, ATM_ZONES, ZONE_COLORS } from '../utils/format'

const ATMS = ['Airport ATM','Big Street ATM','Christ College ATM','KK Nagar ATM','Mount Road ATM']
const Tip  = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:14 }}>
      <p style={{ color:'var(--text2)', marginBottom:4 }}>{label}</p>
      <p style={{ fontFamily:'var(--ff-mono)', color:'var(--accent)', fontWeight:500 }}>{fmtINRFull(payload[0].value)}</p>
    </div>
  )
}

export default function HistoryChart() {
  const [atm,     setAtm]     = useState('Big Street ATM')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchHistory(atm, 90)
      .then(d => setData(d.dates.map((date, i) => ({ date, value: d.values[i] }))))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [atm])

  const avg  = data ? Math.round(data.reduce((s,d)=>s+d.value,0)/data.length) : 0
  const zone = ATM_ZONES[atm] || 'unknown'
  const zc   = ZONE_COLORS[zone] || { text:'var(--text2)' }

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, color:'var(--text)', margin:0 }}>90-day withdrawal history</h2>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{data ? `Avg: ${fmtINR(avg)} / day` : 'Loading…'}</p>
        </div>
        <select value={atm} onChange={e=>setAtm(e.target.value)} style={{ padding:'7px 12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text)', fontSize:14, cursor:'pointer', outline:'none', appearance:'none' }}>
          {ATMS.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.06em', background:ZONE_COLORS[zone]?.bg||'var(--bg4)', color:zc.text, display:'inline-block', marginBottom:16 }}>{zone} zone</span>

      {loading ? <div className="skeleton" style={{ height:220 }}/> :
       !data    ? <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:14 }}>Connect to Flask API to load history</div> : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:0 }}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.25}/>
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="date" tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} interval={14}/>
            <YAxis tickFormatter={fmtINR} tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} width={48}/>
            <Tooltip content={<Tip/>}/>
            <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={1.5} fill="url(#ag)" dot={false} activeDot={{ r:4, fill:'var(--accent)', strokeWidth:0 }}/>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

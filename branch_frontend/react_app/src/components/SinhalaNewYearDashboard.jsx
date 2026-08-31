// src/components/SinhalaNewYearDashboard.jsx
// Sinhala & Tamil New Year (Aluth Avurudda) — April 14 every year
// Full ATM demand prediction for the 5-day festival cluster

import { useState, useEffect } from 'react'
import { fetchSinhalaNewYear, fetchSinhalaPredict } from '../utils/api'
import { fmtINR, fmtINRFull } from '../utils/format'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts'

// ── ATM base data ──────────────────────────────────────────
const ATM_BASE  = {
  'Airport ATM':312400, 'Big Street ATM':300975,
  'Christ College ATM':287600, 'KK Nagar ATM':421300, 'Mount Road ATM':298500,
}
const ATM_ZONES = {
  'Airport ATM':'transport', 'Big Street ATM':'commercial',
  'Christ College ATM':'educational', 'KK Nagar ATM':'residential', 'Mount Road ATM':'commercial',
}
const ATMS = Object.keys(ATM_BASE)

// ── Offline cluster data ───────────────────────────────────
const CLUSTER_RULES = [
  { day:12, label:'Pre New Year (Apr 12)', icon:'🎊', mult:1.25, color:'#F59E0B',
    desc:'Shopping begins — new clothes, kiri bath ingredients, gifts' },
  { day:13, label:'New Year Eve (Apr 13)',  icon:'🎉', mult:1.40, color:'#EF4444',
    desc:'Peak withdrawal day — highest pre-festival cash demand (+40%)' },
  { day:14, label:"New Year Day (Apr 14)",  icon:'🌸', mult:0.75, color:'#6EE7B7',
    desc:'Public holiday — banks closed, family celebrations (−25%)' },
  { day:15, label:'Post New Year (Apr 15)', icon:'🙏', mult:1.20, color:'#60A5FA',
    desc:'Gifting, visiting relatives — above-normal withdrawals (+20%)' },
  { day:16, label:'Post New Year (Apr 16)', icon:'📅', mult:1.10, color:'#A78BFA',
    desc:'Normal life resumes — slight above-average activity (+10%)' },
]

function buildClusterLocal(year) {
  return CLUSTER_RULES.map(r => {
    const ts = new Date(year, 3, r.day)
    return {
      date:       `${year}-04-${String(r.day).padStart(2,'0')}`,
      label:      r.label,
      icon:       r.icon,
      multiplier: r.mult,
      desc:       r.desc,
      color:      r.color,
      day_of_week:ts.toLocaleDateString('en-US',{weekday:'long'}),
      is_weekend: [0,6].includes(ts.getDay()),
    }
  })
}

function getOfflineInfo(dateStr) {
  const m = +dateStr.slice(5,7)
  const d = +dateStr.slice(8,10)
  if (m !== 4) return null
  return CLUSTER_RULES.find(r => r.day === d) || null
}

// ── Shared styles ──────────────────────────────────────────
const inp = {
  padding:'8px 12px', background:'var(--bg3)',
  border:'1px solid var(--border)', borderRadius:8,
  color:'var(--text)', fontFamily:'var(--ff-body)',
  fontSize:14, outline:'none', appearance:'none', cursor:'pointer',
}
const lbl = {
  fontSize:12, fontWeight:600, color:'var(--text3)',
  letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:5,
}

const GOLD    = '#F59E0B'
const GOLD_DIM= 'rgba(245,158,11,0.12)'
const GOLD_BD = 'rgba(245,158,11,0.25)'

// ── Tooltip ────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'var(--text2)', marginBottom:4, fontWeight:500 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color||p.fill, margin:'2px 0' }}>
          {p.name}: {fmtINRFull(p.value)}
        </p>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 1 — 5-day cluster overview
// ══════════════════════════════════════════════════════════
function ClusterOverview() {
  const [year,    setYear]    = useState(2025)
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadCluster(2025) }, [])

  const loadCluster = async (yr) => {
    setLoading(true)
    try {
      const r = await fetchSinhalaNewYear(yr)
      setCluster(r.cluster)
    } catch {
      setCluster(buildClusterLocal(yr))
    } finally { setLoading(false) }
  }

  const changeYear = yr => { setYear(+yr); loadCluster(+yr) }

  // Chart data — demand index across 5 days
  const lineData = (cluster || buildClusterLocal(year)).map(d => ({
    name:  d.icon + ' ' + d.label.slice(0,6),
    label: d.label,
    index: Math.round(d.multiplier * 100),
    mult:  d.multiplier,
  }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header card */}
      <div style={{ background:GOLD_DIM, border:`1px solid ${GOLD_BD}`, borderRadius:14, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, color:'var(--text)', margin:0 }}>
              🌸 Sinhala &amp; Tamil New Year — 5-Day Cluster
            </h3>
            <p style={{ fontSize:13, color:'var(--text3)', marginTop:3 }}>
              Aluth Avurudda · April 14 every year · Sri Lanka's biggest cultural festival
            </p>
          </div>
          <select value={year} onChange={e=>changeYear(e.target.value)} style={{ ...inp, width:'auto' }}>
            {Array.from({length:15},(_,i)=>2020+i).map(y=>(
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* 5 day cards */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} className="skeleton" style={{ height:120 }}/>
            ))}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {(cluster||buildClusterLocal(year)).map((d,i)=>(
              <div key={i} style={{
                background: i===2 ? 'rgba(110,231,183,0.08)' : 'rgba(0,0,0,0.2)',
                border: `1.5px solid ${i===2?'rgba(110,231,183,0.3)':d.color+'44'}`,
                borderRadius:10, padding:'12px 10px',
                position:'relative', textAlign:'center',
              }}>
                {/* ✓ tick */}
                <div style={{
                  position:'absolute', top:8, right:8,
                  width:16, height:16, borderRadius:'50%',
                  background:`${d.color}22`,
                  border:`1.5px solid ${d.color}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, color:d.color, fontWeight:700,
                }}>✓</div>

                <p style={{ fontSize:25, margin:'0 0 6px' }}>{d.icon}</p>
                <p style={{ fontSize:12, color:'var(--text3)', margin:'0 0 2px', fontWeight:600, letterSpacing:'0.04em' }}>
                  APR {d.date?.slice(8)}
                </p>
                <p style={{ fontFamily:'var(--ff-mono)', fontSize:23, fontWeight:700,
                  color:d.color, lineHeight:1, margin:'0 0 6px' }}>
                  ×{d.multiplier?.toFixed(2)}
                </p>
                <div style={{ height:4, background:'var(--bg4)', borderRadius:2, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ height:'100%', width:`${Math.min(d.multiplier*70,100)}%`,
                    background:d.color, borderRadius:2 }}/>
                </div>
                <p style={{ fontSize:11, color:'var(--text3)', margin:0, lineHeight:1.4 }}>
                  {d.multiplier>1
                    ? `+${Math.round((d.multiplier-1)*100)}% demand`
                    : `−${Math.round((1-d.multiplier)*100)}% demand`}
                </p>
                {d.is_weekend && (
                  <p style={{ fontSize:10, color:GOLD, marginTop:4, opacity:.8 }}>Weekend</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demand trend line chart */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:4 }}>
          5-Day Demand Trend (Index: 100 = Normal)
        </p>
        <p style={{ fontSize:13, color:'var(--text3)', marginBottom:14 }}>
          How ATM cash demand changes across the festival period
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData} margin={{ top:4, right:8, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
            <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false}/>
            <YAxis domain={[60,160]} tickFormatter={v=>`${v}%`}
              tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} width={40}/>
            <Tooltip content={<ChartTip/>} formatter={(v,n)=>[`${v}%`,n]}/>
            <ReferenceLine y={100} stroke="var(--text3)" strokeDasharray="4 4"
              label={{ value:'Normal', position:'insideRight', fontSize:12, fill:'var(--text3)' }}/>
            <Line type="monotone" dataKey="index" name="Demand Index"
              stroke={GOLD} strokeWidth={2.5}
              dot={{ r:5, fill:GOLD, strokeWidth:0 }}
              activeDot={{ r:7, fill:GOLD, strokeWidth:0 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Day descriptions */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {(cluster||buildClusterLocal(year)).map((d,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'11px 14px', background:'var(--bg2)',
            border:'1px solid var(--border)', borderRadius:10,
            transition:'border-color .2s' }}
            onMouseOver={e=>e.currentTarget.style.borderColor=d.color}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <span style={{ fontSize:23, flexShrink:0 }}>{d.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>{d.label}</p>
              <p style={{ fontSize:13, color:'var(--text3)', margin:'2px 0 0' }}>{d.desc}</p>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:17, fontWeight:700,
                color:d.color, margin:0 }}>×{d.multiplier?.toFixed(2)}</p>
              <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>
                {d.day_of_week?.slice(0,3)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 2 — Single date prediction
// ══════════════════════════════════════════════════════════
function SinhalaPredictPanel() {
  const [date,    setDate]    = useState('2025-04-14')
  const [atm,     setAtm]     = useState('all')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => { runPredict('2025-04-14','all') }, [])

  const runPredict = async (d, a) => {
    const useDate = d || date
    const useAtm  = a || atm
    setLoading(true)
    try {
      const r = await fetchSinhalaPredict({ date:useDate, atmFilter:useAtm, isHoliday:'auto' })
      setResult(r); setOffline(false)
    } catch {
      setOffline(true)
      const info = getOfflineInfo(useDate)
      const mult = info?.mult || 1.0
      const atms = useAtm==='all' ? ATMS : [useAtm]
      const preds = atms.map(nm => {
        const base = ATM_BASE[nm]||300000
        const adj  = Math.round(base * mult)
        return {
          atm:nm, zone:ATM_ZONES[nm]||'unknown', predicted:base,
          special_adjusted:adj,
          special_p10:Math.round(adj*.8),
          special_p90:Math.round(adj*1.2),
          special_multiplier:mult,
          special_label:info?.label||'Normal Day',
        }
      })
      setResult({
        date:useDate, predictions:preds,
        special_day:        info !== null,
        special_label:      info?.label || 'Normal Day',
        special_type:       info ? 'sinhala_new_year' : 'default',
        special_multiplier: mult,
        special_icon:       info?.icon || '📅',
        is_sinhala_new_year:info !== null,
        sinhala_info:       info,
      })
    } finally { setLoading(false) }
  }

  const localInfo   = getOfflineInfo(date)
  const activeColor = localInfo?.color || GOLD
  const activeIcon  = result?.special_icon || '📅'
  const activeLabel = result?.special_label || 'Normal Day'
  const activeMult  = result?.special_multiplier || 1.0
  const isSpecial   = result?.special_day || false

  const chartData = result?.predictions?.map(p => ({
    name: p.atm.replace(' ATM',''),
    'Base':     p.predicted,
    'Adjusted': p.special_adjusted || p.predicted,
  })) || []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {offline && (
        <div style={{ padding:'8px 14px', background:GOLD_DIM,
          border:`1px solid ${GOLD_BD}`, borderRadius:8,
          fontSize:13, color:GOLD, display:'flex', gap:8 }}>
          <span>⚠️</span>
          <span>Flask API offline — using local festival calendar. Predictions are estimates.</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16,
              color:'var(--text)', margin:0 }}>
              ATM Demand Prediction
            </h3>
            <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
              Apr 12–16 automatically detected — ✓ tick + demand adjustment applied
            </p>
          </div>
          {isSpecial && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6,
              padding:'5px 12px', borderRadius:20,
              background:`${activeColor}22`,
              color:activeColor, fontSize:14, fontWeight:600,
              border:`1px solid ${activeColor}44` }}>
              {activeIcon} {activeLabel}
            </span>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <p style={lbl}>Date</p>
            <input type="date" value={date}
              onChange={e=>setDate(e.target.value)}
              style={{ ...inp, width:'100%' }}/>
          </div>
          <div>
            <p style={lbl}>ATM</p>
            <select value={atm} onChange={e=>setAtm(e.target.value)} style={{ ...inp, width:'100%' }}>
              <option value="all">All 5 ATMs</option>
              {ATMS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={()=>runPredict(date,atm)} disabled={loading} style={{
            padding:'9px 20px',
            background:loading?'var(--bg4)':`linear-gradient(135deg,${GOLD},#D97706)`,
            color:loading?'var(--text3)':'#1a0a00',
            border:'none', borderRadius:8,
            fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
            cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap',
          }}>
            {loading ? '⏳…' : '🌸 Predict'}
          </button>
        </div>

        {/* Quick date buttons for Apr 12-16 */}
        <div style={{ marginTop:12, display:'flex', gap:6, flexWrap:'wrap' }}>
          <p style={{ ...lbl, margin:'auto 6px auto 0' }}>Quick:</p>
          {CLUSTER_RULES.map(r => {
            const yr = date.slice(0,4) || '2025'
            const ds = `${yr}-04-${String(r.day).padStart(2,'0')}`
            const isActive = date === ds
            return (
              <button key={r.day} onClick={()=>{ setDate(ds); runPredict(ds,atm) }} style={{
                padding:'5px 10px', border:`1px solid ${isActive?r.color:'var(--border)'}`,
                borderRadius:8, background:isActive?`${r.color}22`:'var(--bg3)',
                color:isActive?r.color:'var(--text3)',
                fontFamily:'var(--ff-body)', fontSize:13, cursor:'pointer',
                transition:'all .15s',
              }}>
                {r.icon} Apr {r.day}
              </button>
            )
          })}
        </div>

        {/* Status strip */}
        {result && (
          <div style={{ marginTop:14, padding:'12px 14px',
            background:isSpecial?`${activeColor}11`:'rgba(255,255,255,0.02)',
            border:`1px solid ${isSpecial?activeColor+'33':'var(--border)'}`,
            borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--text)', margin:'0 0 3px' }}>
                {activeIcon} {activeLabel}
              </p>
              <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>
                {localInfo?.desc || (isSpecial ? 'Festival period — demand adjusted' : 'Normal day — standard demand applies')}
              </p>
            </div>
            <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:21, fontWeight:700,
                color:activeColor, margin:0 }}>
                ×{Number(activeMult).toFixed(2)}
              </p>
              <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>
                {activeMult > 1
                  ? `+${Math.round((activeMult-1)*100)}% vs normal`
                  : activeMult < 1
                    ? `−${Math.round((1-activeMult)*100)}% vs normal`
                    : 'no change'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ATM rows */}
      {result?.predictions?.length > 0 && (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {result.predictions.map(p => {
              const adj  = p.special_adjusted || p.predicted
              const diff = adj - p.predicted
              const pct  = ((diff/p.predicted)*100).toFixed(0)
              const maxAdj = Math.max(...result.predictions.map(x=>x.special_adjusted||x.predicted))
              return (
                <div key={p.atm} style={{ display:'grid',
                  gridTemplateColumns:'160px 1fr 90px 100px 62px',
                  gap:12, alignItems:'center', padding:'12px 16px',
                  background:'var(--bg2)', border:'1px solid var(--border)',
                  borderRadius:12, transition:'border-color .2s' }}
                  onMouseOver={e=>e.currentTarget.style.borderColor=activeColor}
                  onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{p.atm}</p>
                    <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{p.zone}</p>
                  </div>
                  <div>
                    <div style={{ height:4, background:'rgba(155,155,174,0.2)',
                      borderRadius:3, width:`${Math.round(p.predicted/maxAdj*100)}%`, marginBottom:4 }}/>
                    <div style={{ height:5, background:activeColor, borderRadius:3,
                      width:`${Math.round(adj/maxAdj*100)}%`, transition:'width .6s' }}/>
                    <p style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>base → adjusted</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text3)',
                      margin:0, textDecoration:'line-through' }}>{fmtINR(p.predicted)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>base</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:600,
                      color:activeColor, margin:0 }}>{fmtINR(adj)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>adjusted</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600, margin:0,
                      color:diff>0?'var(--accent)':diff<0?'var(--rose)':'var(--text3)' }}>
                      {diff>0?'+':''}{pct}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bar chart */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:14, padding:20 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:16 }}>
              Base vs Sinhala New Year Adjusted Demand
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={fmtINR} tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} width={48}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{ fontSize:13 }}/>
                <Bar dataKey="Base"     fill="rgba(155,155,174,0.3)" radius={[4,4,0,0]}/>
                <Bar dataKey="Adjusted" fill={activeColor}            radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 3 — About / Cultural context
// ══════════════════════════════════════════════════════════
function AboutSinhalaNewYear() {
  const facts = [
    { icon:'📅', title:'Date',         desc:'April 14 every year — fixed by the solar calendar (not lunar)' },
    { icon:'🌍', title:'Significance', desc:'Sri Lanka\'s biggest cultural festival celebrated by both Sinhalese and Tamil communities' },
    { icon:'🏛',  title:'Public holiday',desc:'April 13 and 14 are both declared public holidays by the Sri Lankan government' },
    { icon:'💰', title:'ATM impact',   desc:'Highest pre-holiday ATM surge of the year — people withdraw cash for gifts, travel, celebrations' },
    { icon:'🎁', title:'Gift giving',  desc:'Traditional gifts of money are exchanged during the New Year period' },
    { icon:'🏪', title:'Shopping',     desc:'New clothes and food purchases peak on Apr 12–13 before the holiday' },
    { icon:'🕯', title:'Auspicious times',desc:'Traditional auspicious times for activities — banks may open late even on Apr 14' },
    { icon:'🔄', title:'Post-holiday', desc:'Apr 15–16 see above-normal ATM usage as businesses reopen and spending resumes' },
  ]

  const demands = [
    { day:'Apr 12', label:'Pre-holiday shopping',   mult:1.25, color:'#F59E0B' },
    { day:'Apr 13', label:'Peak pre-holiday surge',  mult:1.40, color:'#EF4444' },
    { day:'Apr 14', label:'New Year Day (holiday)',  mult:0.75, color:'#6EE7B7' },
    { day:'Apr 15', label:'Post-holiday gifting',    mult:1.20, color:'#60A5FA' },
    { day:'Apr 16', label:'Normal life resumes',     mult:1.10, color:'#A78BFA' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Cultural context */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:'0 0 14px' }}>
          🌸 About Sinhala &amp; Tamil New Year
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {facts.map((f,i)=>(
            <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px',
              background:'var(--bg3)', borderRadius:10 }}>
              <span style={{ fontSize:21, flexShrink:0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{f.title}</p>
                <p style={{ fontSize:13, color:'var(--text3)', margin:'2px 0 0', lineHeight:1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demand reference table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:'0 0 14px' }}>
          ATM Demand Multipliers — Quick Reference
        </h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {demands.map((d,i)=>(
            <div key={i} style={{ display:'grid',
              gridTemplateColumns:'80px 1fr 1fr 60px',
              gap:12, alignItems:'center',
              padding:'10px 14px', background:'var(--bg3)', borderRadius:10 }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:d.color,
                fontWeight:600, margin:0 }}>{d.day}</p>
              <p style={{ fontSize:14, color:'var(--text)', margin:0 }}>{d.label}</p>
              <div style={{ height:6, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', background:d.color, borderRadius:3,
                  width:`${Math.min(d.mult*65,100)}%` }}/>
              </div>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:700,
                color:d.color, textAlign:'right', margin:0 }}>×{d.mult.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
const SUBTABS = ['5-Day Cluster', 'Predict', 'About']

export default function SinhalaNewYearDashboard() {
  const [tab, setTab] = useState('5-Day Cluster')

  return (
    <div>
      {/* Banner */}
      <div style={{ padding:'16px 20px', marginBottom:16,
        background:GOLD_DIM, border:`1px solid ${GOLD_BD}`,
        borderRadius:14, display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontSize:34, flexShrink:0 }}>🌸</div>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18,
            color:'var(--text)', margin:'0 0 5px' }}>
            Sinhala &amp; Tamil New Year — Aluth Avurudda
          </h2>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0, lineHeight:1.7 }}>
            Sri Lanka's biggest cultural festival · <strong style={{ color:GOLD }}>April 14</strong> every year ·
            5-day ATM demand cluster (Apr 12–16).{' '}
            <strong style={{ color:'#EF4444' }}>+40% surge on Apr 13 (Eve)</strong>,{' '}
            <strong style={{ color:'#6EE7B7' }}>−25% on Apr 14 (Holiday)</strong>,{' '}
            <strong style={{ color:'#60A5FA' }}>+20% on Apr 15 (Post)</strong>.
            The system places a <strong style={{ color:GOLD }}>✓ tick</strong> on each festival day automatically.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:16,
        background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:10, padding:4 }}>
        {SUBTABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:'7px 10px', border:'none', cursor:'pointer',
            borderRadius:8, fontFamily:'var(--ff-body)', fontSize:14, fontWeight:600,
            transition:'all .15s',
            background:tab===t ? GOLD_DIM : 'transparent',
            color:tab===t ? GOLD : 'var(--text3)',
          }}>{t}</button>
        ))}
      </div>

      {tab === '5-Day Cluster' && <ClusterOverview/>}
      {tab === 'Predict'       && <SinhalaPredictPanel/>}
      {tab === 'About'         && <AboutSinhalaNewYear/>}
    </div>
  )
}

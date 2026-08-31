// src/components/PoyaDashboard.jsx
// Sri Lankan Poya Day ATM Prediction Dashboard
// Supports 2011–2035: 2011-2030 declared, 2031-2035 lunar-calculated

import { useState, useEffect } from 'react'
import { POYA_DATES, DECLARED_YEARS } from '../utils/poyaDates'
import { fetchPoyaCalendar, fetchPoyaPredict, fetchPoyaYearPredictions } from '../utils/api'
import { fmtINR, fmtINRFull } from '../utils/format'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

// ── Constants ──────────────────────────────────────────────
const ATMS   = ['Airport ATM','Big Street ATM','Christ College ATM','KK Nagar ATM','Mount Road ATM']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const SUBTABS = ['Predict','Calendar','Year Map']
const ALL_YEARS = Array.from({length:25}, (_,i) => 2011+i) // 2011-2035

const ATM_BASE = {
  'Airport ATM':312400,'Big Street ATM':300975,
  'Christ College ATM':287600,'KK Nagar ATM':421300,'Mount Road ATM':298500
}
const ATM_ZONES = {
  'Airport ATM':'transport','Big Street ATM':'commercial',
  'Christ College ATM':'educational','KK Nagar ATM':'residential','Mount Road ATM':'commercial'
}

// ── Local Poya helpers (work offline) ──────────────────────
function buildPoyaSet(year) {
  const s    = new Set()
  const raw  = POYA_DATES[String(year)] || []
  raw.forEach(([m,d]) => {
    const ds = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    s.add(ds)
  })
  return s
}

function poyaInfoForDate(dateStr) {
  const yr  = +dateStr.slice(0,4)
  const set = buildPoyaSet(yr)
  const addDay  = (ds, n) => { const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10) }
  const isPoya     = set.has(dateStr)
  const isPrePoya  = set.has(addDay(dateStr, 1))
  const isPostPoya = set.has(addDay(dateStr, -1))
  const mult  = isPoya?0.80:isPrePoya?1.30:isPostPoya?1.10:1.0
  const label = isPoya?'Poya Day':isPrePoya?'Pre-Poya':isPostPoya?'Post-Poya':'Normal Day'
  return { is_poya:isPoya, is_pre_poya:isPrePoya, is_post_poya:isPostPoya,
           poya_label:label, poya_multiplier:mult }
}

function buildCalendarLocal(year) {
  const raw = POYA_DATES[String(year)] || []
  return raw.map(([m,d]) => {
    const ts  = new Date(year, m-1, d)
    const dow = ts.getDay()
    return {
      date:        `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      month_name:  MONTH_NAMES[m-1],
      day_of_week: DAYS[dow],
      day:d, month:m, year,
      is_weekend:  dow===0||dow===6,
      is_calculated: !DECLARED_YEARS.includes(year),
    }
  })
}

function buildYearMapLocal(year) {
  const set   = buildPoyaSet(year)
  const days  = []
  const start = new Date(year, 0, 1)
  const end   = new Date(year, 11, 31)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    const ds   = d.toISOString().slice(0,10)
    const info = poyaInfoForDate(ds)
    days.push({
      date:ds, month:d.getMonth()+1, day:d.getDate(),
      day_of_week:DAYS[d.getDay()], ...info,
      predictions: ATMS.map(a => ({
        atm:a, predicted:Math.round((ATM_BASE[a]||300000)*info.poya_multiplier)
      }))
    })
  }
  return { year, days, total_days:days.length }
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

// ── Poya badge ─────────────────────────────────────────────
function PoyaBadge({ label }) {
  const cfg = {
    'Poya Day':  { bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', icon:'🌕' },
    'Pre-Poya':  { bg:'rgba(110,231,183,0.15)', color:'#6EE7B7', icon:'🌔' },
    'Post-Poya': { bg:'rgba(96,165,250,0.15)',  color:'#60A5FA', icon:'🌖' },
    'Normal Day':{ bg:'rgba(255,255,255,0.05)', color:'#9B9BAE', icon:'☀️' },
  }
  const c = cfg[label] || cfg['Normal Day']
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      padding:'4px 10px', borderRadius:20, background:c.bg, color:c.color,
      fontSize:13, fontWeight:600 }}>
      {c.icon} {label}
    </span>
  )
}

// ── Bar chart tooltip ──────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)',
      borderRadius:8, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'var(--text2)', marginBottom:4 }}>{label}</p>
      {payload.map(p=><p key={p.name} style={{ color:p.color }}>
        {p.name}: {fmtINRFull(p.value)}
      </p>)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB 1 — Predict
// ══════════════════════════════════════════════════════════
function PoyaPredictPanel() {
  const [date,    setDate]    = useState('2025-01-13')
  const [atm,     setAtm]     = useState('all')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => { runPredict('2025-01-13', 'all') }, [])

  const runPredict = async (d, a) => {
    const useDate = d || date
    const useAtm  = a || atm
    setLoading(true)
    try {
      const r = await fetchPoyaPredict({ date:useDate, atmFilter:useAtm, isHoliday:'auto' })
      setResult(r); setOffline(false)
    } catch {
      setOffline(true)
      const poya = poyaInfoForDate(useDate)
      const atms = useAtm==='all' ? ATMS : [useAtm]
      const preds = atms.map(nm => {
        const base = ATM_BASE[nm]||300000
        const adj  = Math.round(base * poya.poya_multiplier)
        return { atm:nm, zone:ATM_ZONES[nm]||'unknown', predicted:base,
          poya_adjusted:adj, poya_p10:Math.round(adj*.8), poya_p90:Math.round(adj*1.2),
          poya_multiplier:poya.poya_multiplier, poya_label:poya.poya_label,
          is_poya:poya.is_poya, is_pre_poya:poya.is_pre_poya, is_post_poya:poya.is_post_poya }
      })
      setResult({ ...poya, date:useDate, predictions:preds })
    } finally { setLoading(false) }
  }

  const chartData = result?.predictions?.map(p => ({
    name: p.atm.replace(' ATM',''),
    'Base':          p.predicted,
    'Poya Adjusted': p.poya_adjusted,
  })) || []

  const statusBg = result?.is_poya?'rgba(251,191,36,0.08)':result?.is_pre_poya?'rgba(110,231,183,0.08)':result?.is_post_poya?'rgba(96,165,250,0.08)':'rgba(255,255,255,0.02)'
  const statusBorder = result?.is_poya?'rgba(251,191,36,0.3)':result?.is_pre_poya?'rgba(110,231,183,0.3)':result?.is_post_poya?'rgba(96,165,250,0.3)':'var(--border)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {offline && (
        <div style={{ padding:'8px 14px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, fontSize:13, color:'var(--amber)', display:'flex', gap:8 }}>
          <span>⚠️</span>
          <span>Flask API offline — using local Poya calendar. Predictions are estimates based on historical averages.</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
              Poya Day Prediction
            </h3>
            <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
              Select any date from 2011–2035 — ✓ tick appears on Poya days automatically
            </p>
          </div>
          {result && <PoyaBadge label={result.poya_label}/>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <p style={lbl}>Date (2011–2035)</p>
            <input type="date" value={date} min="2011-01-01" max="2035-12-31"
              onChange={e=>setDate(e.target.value)} style={{ ...inp, width:'100%' }}/>
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
            background:loading?'var(--bg4)':'linear-gradient(135deg,#FBBF24,#D97706)',
            color:loading?'var(--text3)':'#1a0a00',
            border:'none', borderRadius:8,
            fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
            cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap',
          }}>
            {loading ? '⏳…' : '🌕 Predict'}
          </button>
        </div>

        {/* Poya status strip */}
        {result && (
          <div style={{ marginTop:14, padding:'11px 14px', background:statusBg,
            border:`1px solid ${statusBorder}`, borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, color:'var(--text2)' }}>
              {result.is_poya      && '🌕 Poya day — ATM demand lower (−20%). Banks are closed.'}
              {result.is_pre_poya  && '🌔 Pre-Poya day — people withdraw cash before holiday (+30%).'}
              {result.is_post_poya && '🌖 Post-Poya day — catch-up withdrawals after holiday (+10%).'}
              {!result.is_poya && !result.is_pre_poya && !result.is_post_poya && '☀️ Normal working day — no Poya effect on demand.'}
            </span>
            <span style={{ fontFamily:'var(--ff-mono)', fontSize:17, fontWeight:700,
              color:'var(--amber)', marginLeft:14, flexShrink:0 }}>
              ×{Number(result.poya_multiplier).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ATM Prediction Rows */}
      {result?.predictions?.length > 0 && (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {result.predictions.map(p => {
              const diff   = p.poya_adjusted - p.predicted
              const pct    = ((diff/p.predicted)*100).toFixed(0)
              const maxAdj = Math.max(...result.predictions.map(x=>x.poya_adjusted))
              return (
                <div key={p.atm} style={{ display:'grid',
                  gridTemplateColumns:'160px 1fr 90px 100px 62px',
                  gap:12, alignItems:'center', padding:'12px 16px',
                  background:'var(--bg2)', border:'1px solid var(--border)',
                  borderRadius:12, transition:'border-color .2s' }}
                  onMouseOver={e=>e.currentTarget.style.borderColor='var(--border2)'}
                  onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{p.atm}</p>
                    <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{p.zone}</p>
                  </div>
                  <div>
                    <div style={{ height:4, background:'rgba(155,155,174,0.2)',
                      borderRadius:3, width:`${Math.round(p.predicted/maxAdj*100)}%`, marginBottom:4 }}/>
                    <div style={{ height:5, background:'#FBBF24', borderRadius:3,
                      width:`${Math.round(p.poya_adjusted/maxAdj*100)}%`, transition:'width .6s' }}/>
                    <p style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>base → poya adjusted</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text3)',
                      margin:0, textDecoration:'line-through' }}>{fmtINR(p.predicted)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>base</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:600,
                      color:'#FBBF24', margin:0 }}>{fmtINR(p.poya_adjusted)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>poya adjusted</p>
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
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:16 }}>
              Base vs Poya-Adjusted Demand
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={fmtINR} tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} width={48}/>
                <Tooltip content={<BarTip/>}/>
                <Legend wrapperStyle={{ fontSize:13 }}/>
                <Bar dataKey="Base"          fill="rgba(155,155,174,0.3)" radius={[4,4,0,0]}/>
                <Bar dataKey="Poya Adjusted" fill="#FBBF24"               radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB 2 — Annual Calendar
// ══════════════════════════════════════════════════════════
function PoyaCalendarView() {
  const [year,    setYear]    = useState(2025)
  const [cal,     setCal]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [apiUsed, setApiUsed] = useState(false)

  useEffect(() => { loadCal(2025) }, [])

  const loadCal = async (yr) => {
    setLoading(true)
    try {
      const r = await fetchPoyaCalendar(yr)
      setCal(r); setApiUsed(true)
    } catch {
      setCal({ year:yr, poya_dates:buildCalendarLocal(yr), count:buildCalendarLocal(yr).length })
      setApiUsed(false)
    } finally { setLoading(false) }
  }

  const changeYear = (yr) => { setYear(+yr); loadCal(+yr) }
  const isCalculated = !DECLARED_YEARS.includes(year)

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
            Annual Poya Calendar
          </h3>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
            Poya date shifts every month — ✓ marks the exact day
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isCalculated && (
            <span style={{ fontSize:12, padding:'3px 8px', borderRadius:20,
              background:'rgba(96,165,250,0.12)', color:'var(--blue)',
              border:'1px solid rgba(96,165,250,0.2)' }}>
              🔭 Lunar calculated
            </span>
          )}
          <select value={year} onChange={e=>changeYear(e.target.value)} style={{ ...inp, width:'auto' }}>
            {ALL_YEARS.map(y=>(
              <option key={y} value={y}>
                {y}{!DECLARED_YEARS.includes(y) ? ' (calc)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculated year notice */}
      {isCalculated && (
        <div style={{ padding:'9px 14px', marginBottom:14,
          background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
          borderRadius:8, fontSize:14, color:'var(--blue)', display:'flex', gap:8 }}>
          <span>🔭</span>
          <span>
            Poya dates for {year} are calculated from the lunar calendar.
            The Sri Lankan government has not yet officially declared these dates.
            Accuracy is within ±1 day of the actual full moon.
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {Array.from({length:12}).map((_,i)=>(
            <div key={i} className="skeleton" style={{ height:85 }}/>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {(cal?.poya_dates||[]).map((p,i) => (
              <div key={i} style={{
                background: p.is_calculated ? 'rgba(96,165,250,0.05)' : 'rgba(251,191,36,0.06)',
                border: `1px solid ${p.is_calculated ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)'}`,
                borderRadius:10, padding:'12px 14px', position:'relative',
              }}>
                {/* ✓ tick badge */}
                <div style={{
                  position:'absolute', top:10, right:10, width:19, height:19,
                  borderRadius:'50%',
                  background: p.is_calculated ? 'rgba(96,165,250,0.15)' : 'rgba(251,191,36,0.2)',
                  border: `1.5px solid ${p.is_calculated ? '#60A5FA' : '#FBBF24'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                  color: p.is_calculated ? '#60A5FA' : '#FBBF24',
                }}>✓</div>

                <p style={{ fontSize:12, color:'var(--text3)', fontWeight:600,
                  letterSpacing:'0.06em', textTransform:'uppercase', margin:'0 0 6px' }}>
                  {p.month_name}
                </p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily:'var(--ff-mono)', fontSize:32, fontWeight:500,
                    color: p.is_calculated ? '#60A5FA' : '#FBBF24', lineHeight:1 }}>
                    {p.day}
                  </span>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>
                    {p.day_of_week?.slice(0,3)}
                  </span>
                </div>
                {p.is_weekend && (
                  <p style={{ fontSize:11, marginTop:4, opacity:.75,
                    color: p.is_calculated ? '#60A5FA' : '#FBBF24' }}>
                    Weekend Poya
                  </p>
                )}
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
            {[
              { color:'rgba(251,191,36,0.4)',  label:'Poya day — demand ×0.80' },
              { color:'rgba(110,231,183,0.4)', label:'Pre-Poya — demand ×1.30' },
              { color:'rgba(96,165,250,0.4)',  label:'Post-Poya — demand ×1.10' },
              { color:'rgba(96,165,250,0.15)', label:'🔭 Lunar-calculated (2031+)' },
            ].map(l=>(
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:l.color }}/>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB 3 — Year Map
// ══════════════════════════════════════════════════════════
function PoyaYearHeatmap() {
  const [year,     setYear]     = useState(2025)
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadYear(2025) }, [])

  const loadYear = async (yr) => {
    setLoading(true); setSelected(null)
    try {
      const r = await fetchPoyaYearPredictions(yr)
      setData(r)
    } catch {
      setData(buildYearMapLocal(yr))
    } finally { setLoading(false) }
  }

  const changeYear = (yr) => { setYear(+yr); loadYear(+yr) }

  if (loading) return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
      <div className="skeleton" style={{ height:300 }}/>
    </div>
  )

  const byMonth = {}
  ;(data?.days||[]).forEach(d => {
    if (!byMonth[d.month]) byMonth[d.month] = []
    byMonth[d.month].push(d)
  })
  const totalPoya    = (data?.days||[]).filter(d=>d.is_poya).length
  const isCalculated = !DECLARED_YEARS.includes(year)

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
            Full Year Poya Map
          </h3>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
            Every day predicted — gold ✓ cells are Poya days. Click any cell.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, color:'var(--amber)' }}>🌕 {totalPoya}</span>
          {isCalculated && (
            <span style={{ fontSize:12, padding:'2px 7px', borderRadius:20,
              background:'rgba(96,165,250,0.12)', color:'var(--blue)' }}>
              🔭 calc
            </span>
          )}
          <select value={year} onChange={e=>changeYear(e.target.value)} style={{ ...inp, width:'auto' }}>
            {ALL_YEARS.map(y=>(
              <option key={y} value={y}>
                {y}{!DECLARED_YEARS.includes(y) ? '*' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isCalculated && (
        <div style={{ padding:'8px 12px', marginBottom:12,
          background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)',
          borderRadius:8, fontSize:13, color:'var(--blue)', display:'flex', gap:8 }}>
          <span>🔭</span>
          <span>Dates for {year} are calculated using the lunar calendar. Official government dates not yet declared.</span>
        </div>
      )}

      {/* Month rows */}
      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
        {Object.entries(byMonth).map(([month, days]) => (
          <div key={month} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:12, color:'var(--text3)', width:26, textAlign:'right', flexShrink:0 }}>
              {MONTHS[+month-1]}
            </span>
            <div style={{ display:'flex', gap:2 }}>
              {days.map(d => {
                const isSel = selected?.date === d.date
                const bg = d.is_poya    ? '#FBBF24'
                         : d.is_pre_poya ? 'rgba(110,231,183,0.5)'
                         : d.is_post_poya? 'rgba(96,165,250,0.4)'
                         : 'var(--bg4)'
                return (
                  <div key={d.date}
                    title={`${d.date} — ${d.poya_label}`}
                    onClick={() => setSelected(isSel ? null : d)}
                    style={{ width:15, height:15, borderRadius:2, background:bg,
                      border:isSel?'2px solid var(--accent)':'1px solid transparent',
                      cursor:'pointer', display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:9,
                      color:d.is_poya?'#021a10':'transparent',
                      flexShrink:0, transition:'transform .1s' }}
                    onMouseOver={e=>e.currentTarget.style.transform='scale(1.5)'}
                    onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                    {d.is_poya ? '✓' : ''}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div style={{ padding:'12px 16px', background:'var(--bg3)',
          border:'1px solid var(--border2)', borderRadius:10,
          display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          gap:12, marginBottom:12 }}>
          <div>
            <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>Date</p>
            <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, color:'var(--text)', margin:0 }}>{selected.date}</p>
          </div>
          <div>
            <p style={{ fontSize:12, color:'var(--text3)', margin:'0 0 4px' }}>Status</p>
            <PoyaBadge label={selected.poya_label}/>
          </div>
          <div>
            <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>Multiplier</p>
            <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:700,
              color:'var(--amber)', margin:0 }}>×{Number(selected.multiplier).toFixed(2)}</p>
          </div>
          <div>
            <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>Day</p>
            <p style={{ fontSize:14, color:'var(--text2)', margin:0 }}>{selected.day_of_week}</p>
          </div>
          {selected.predictions?.slice(0,4).map(p=>(
            <div key={p.atm}>
              <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{p.atm.replace(' ATM','')}</p>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text)', margin:0 }}>
                {fmtINR(p.predicted)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { color:'#FBBF24',                    label:'Poya ✓' },
          { color:'rgba(110,231,183,0.5)',       label:'Pre-Poya' },
          { color:'rgba(96,165,250,0.4)',        label:'Post-Poya' },
          { color:'var(--bg4)',                  label:'Normal' },
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:l.color }}/>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:12, color:'var(--blue)' }}>* = lunar calculated (2031+)</span>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function PoyaDashboard() {
  const [tab, setTab] = useState('Predict')
  return (
    <div>
      {/* Banner */}
      <div style={{ padding:'14px 18px', marginBottom:16,
        background:'rgba(251,191,36,0.06)',
        border:'1px solid rgba(251,191,36,0.2)',
        borderRadius:14, display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontSize:32, flexShrink:0 }}>🌕</div>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18,
            color:'var(--text)', margin:'0 0 4px' }}>
            Sri Lankan Poya Day ATM Prediction
          </h2>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0, lineHeight:1.6 }}>
            Supports <strong style={{ color:'var(--text2)' }}>2011–2030</strong> (government declared) and{' '}
            <strong style={{ color:'var(--blue)' }}>2031–2035</strong> (lunar calculated 🔭).
            Every day can be marked as a Poya day — the system shows a{' '}
            <strong style={{ color:'var(--amber)' }}>✓ tick</strong> and adjusts demand:{' '}
            <strong style={{ color:'var(--rose)' }}>−20% on Poya day</strong>,{' '}
            <strong style={{ color:'var(--accent)' }}>+30% day before</strong>,{' '}
            <strong style={{ color:'var(--blue)' }}>+10% day after</strong>.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:16,
        background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:10, padding:4 }}>
        {SUBTABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'7px 10px', border:'none', cursor:'pointer',
            borderRadius:8, fontFamily:'var(--ff-body)', fontSize:14, fontWeight:600,
            transition:'all .15s',
            background:tab===t ? 'rgba(251,191,36,0.15)' : 'transparent',
            color:tab===t ? '#FBBF24' : 'var(--text3)',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'Predict'  && <PoyaPredictPanel/>}
      {tab === 'Calendar' && <PoyaCalendarView/>}
      {tab === 'Year Map' && <PoyaYearHeatmap/>}
    </div>
  )
}

// src/components/SpecialDaysDashboard.jsx
// Christmas Day, New Year, Diwali ATM demand prediction
// Shows ✓ tick + demand adjustment for each special day cluster

import { useState, useEffect } from 'react'
import { fetchSpecialPredict, fetchChristmasDates } from '../utils/api'
import { fmtINR, fmtINRFull } from '../utils/format'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

// ── ATM base data ──────────────────────────────────────────
const ATM_BASE  = { 'Airport ATM':312400,'Big Street ATM':300975,'Christ College ATM':287600,'KK Nagar ATM':421300,'Mount Road ATM':298500 }
const ATM_ZONES = { 'Airport ATM':'transport','Big Street ATM':'commercial','Christ College ATM':'educational','KK Nagar ATM':'residential','Mount Road ATM':'commercial' }
const ATMS      = Object.keys(ATM_BASE)

// ── Special day knowledge (offline fallback) ───────────────
const SPECIAL_RULES = [
  { match:(m,d)=>m===12&&d===24, label:'Christmas Eve',  icon:'🎄', mult:1.35, type:'christmas', desc:'Last-minute shopping — high withdrawal demand (+35%)' },
  { match:(m,d)=>m===12&&d===25, label:'Christmas Day',  icon:'🎅', mult:0.85, type:'christmas', desc:'Public holiday — banks closed, lower demand (−15%)' },
  { match:(m,d)=>m===12&&d===26, label:'Boxing Day',     icon:'🎁', mult:1.20, type:'christmas', desc:'Post-holiday spending resumes (+20%)' },
  { match:(m,d)=>m===12&&d===31, label:'New Year Eve',   icon:'🎆', mult:1.40, type:'newyear',   desc:'Party / travel spending — highest surge (+40%)' },
  { match:(m,d)=>m===1 &&d===1,  label:'New Year Day',   icon:'🎊', mult:0.90, type:'newyear',   desc:'Public holiday — quiet (−10%)' },
  { match:(m,d)=>m===1 &&d===2,  label:'Post New Year',  icon:'🗓', mult:1.15, type:'newyear',   desc:'Normal activity resumes (+15%)' },
]

function getLocalSpecialInfo(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00')
  const m   = d.getMonth() + 1
  const day = d.getDate()
  const rule = SPECIAL_RULES.find(r => r.match(m, day))
  return rule || null
}

// ── Type colour palette ────────────────────────────────────
const TYPE_COLORS = {
  christmas: { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  accent:'#EF4444', dim:'rgba(239,68,68,0.15)'  },
  newyear:   { bg:'rgba(168,85,247,0.08)', border:'rgba(168,85,247,0.25)', accent:'#A855F7', dim:'rgba(168,85,247,0.15)' },
  diwali:    { bg:'rgba(251,191,36,0.08)', border:'rgba(251,191,36,0.25)', accent:'#FBBF24', dim:'rgba(251,191,36,0.15)' },
  default:   { bg:'rgba(255,255,255,0.03)',border:'var(--border)',         accent:'#9B9BAE',  dim:'var(--bg4)' },
}

function getTypeColor(type) { return TYPE_COLORS[type] || TYPE_COLORS.default }

// ── Shared styles ──────────────────────────────────────────
const inp = {
  padding:'8px 12px', background:'var(--bg3)',
  border:'1px solid var(--border)', borderRadius:8,
  color:'var(--text)', fontFamily:'var(--ff-body)',
  fontSize:14, outline:'none', appearance:'none', cursor:'pointer',
}
const lbl = { fontSize:12, fontWeight:600, color:'var(--text3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:5 }

// ── Bar chart tooltip ──────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'var(--text2)', marginBottom:4 }}>{label}</p>
      {payload.map(p=><p key={p.name} style={{ color:p.color }}>{p.name}: {fmtINRFull(p.value)}</p>)}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 1: Predict any special day
// ══════════════════════════════════════════════════════════
function SpecialPredictPanel() {
  const [date,    setDate]    = useState('2025-12-25')
  const [atm,     setAtm]     = useState('all')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => { runPredict('2025-12-25','all') }, [])

  const runPredict = async (d, a) => {
    const useDate = d || date
    const useAtm  = a || atm
    setLoading(true)
    try {
      const r = await fetchSpecialPredict({ date:useDate, atmFilter:useAtm, isHoliday:'auto' })
      setResult(r); setOffline(false)
    } catch {
      // Offline fallback
      setOffline(true)
      const info = getLocalSpecialInfo(useDate)
      const mult = info?.mult || 1.0
      const atms = useAtm==='all' ? ATMS : [useAtm]
      const preds = atms.map(nm => {
        const base = ATM_BASE[nm]||300000
        const adj  = Math.round(base * mult)
        return {
          atm:nm, zone:ATM_ZONES[nm]||'unknown', predicted:base,
          special_adjusted:adj, special_p10:Math.round(adj*.8), special_p90:Math.round(adj*1.2),
          special_multiplier:mult, special_label:info?.label||'Normal Day',
        }
      })
      setResult({
        date:useDate, predictions:preds,
        special_day:   info !== null,
        special_label: info?.label || 'Normal Day',
        special_type:  info?.type  || 'default',
        special_multiplier: mult,
        special_icon:  info?.icon  || '📅',
      })
    } finally { setLoading(false) }
  }

  const specialInfo = result?.special_day ? getLocalSpecialInfo(date) : null
  const tc = getTypeColor(result?.special_type)

  const chartData = result?.predictions?.map(p => ({
    name: p.atm.replace(' ATM',''),
    'Base':             p.predicted,
    'Special Adjusted': p.special_adjusted || p.predicted,
  })) || []

  const chartColor = result?.special_type === 'christmas' ? '#EF4444'
                   : result?.special_type === 'newyear'   ? '#A855F7'
                   : result?.special_type === 'diwali'    ? '#FBBF24'
                   : '#9B9BAE'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {offline && (
        <div style={{ padding:'8px 14px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, fontSize:13, color:'var(--amber)', display:'flex', gap:8 }}>
          <span>⚠️</span><span>Flask API offline — using local special day rules. Predictions are estimates.</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
              Special Day Prediction
            </h3>
            <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
              Select any date — ✓ tick appears automatically on Christmas, New Year &amp; Diwali
            </p>
          </div>
          {result?.special_day && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:tc.dim, color:tc.accent, fontSize:14, fontWeight:600, border:`1px solid ${tc.border}` }}>
              {result.special_icon} {result.special_label}
            </span>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <p style={lbl}>Date</p>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ ...inp, width:'100%' }}/>
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
            background:loading?'var(--bg4)':'linear-gradient(135deg,#EF4444,#DC2626)',
            color:loading?'var(--text3)':'#fff',
            border:'none', borderRadius:8,
            fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
            cursor:loading?'not-allowed':'pointer', whiteSpace:'nowrap',
          }}>
            {loading ? '⏳…' : '🎄 Predict'}
          </button>
        </div>

        {/* Status strip */}
        {result && (
          <div style={{ marginTop:14, padding:'11px 14px', background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:14, color:'var(--text)', margin:'0 0 3px', fontWeight:500 }}>
                {result.special_icon || '📅'} {result.special_label || 'Normal Day'}
              </p>
              <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>
                {specialInfo?.desc || (result.special_day ? 'Special holiday — adjusted demand' : 'No special day — standard demand applies')}
              </p>
            </div>
            <span style={{ fontFamily:'var(--ff-mono)', fontSize:18, fontWeight:700, color:tc.accent, marginLeft:16, flexShrink:0 }}>
              ×{Number(result.special_multiplier||1).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ATM Result Rows */}
      {result?.predictions?.length > 0 && (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {result.predictions.map(p => {
              const adj  = p.special_adjusted || p.predicted
              const diff = adj - p.predicted
              const pct  = ((diff/p.predicted)*100).toFixed(0)
              const maxAdj = Math.max(...result.predictions.map(x=>x.special_adjusted||x.predicted))
              return (
                <div key={p.atm} style={{ display:'grid', gridTemplateColumns:'160px 1fr 90px 100px 62px', gap:12, alignItems:'center', padding:'12px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, transition:'border-color .2s' }}
                  onMouseOver={e=>e.currentTarget.style.borderColor=tc.accent}
                  onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>{p.atm}</p>
                    <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{p.zone}</p>
                  </div>
                  <div>
                    <div style={{ height:4, background:'rgba(155,155,174,0.2)', borderRadius:3, width:`${Math.round(p.predicted/maxAdj*100)}%`, marginBottom:4 }}/>
                    <div style={{ height:5, background:chartColor, borderRadius:3, width:`${Math.round(adj/maxAdj*100)}%`, transition:'width .6s' }}/>
                    <p style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>base → special adjusted</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--text3)', margin:0, textDecoration:'line-through' }}>{fmtINR(p.predicted)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>base</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:600, color:tc.accent, margin:0 }}>{fmtINR(adj)}</p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>adjusted</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600, margin:0, color:diff>0?'var(--accent)':diff<0?'var(--rose)':'var(--text3)' }}>
                      {diff>0?'+':''}{pct}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bar chart */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:16 }}>Base vs Special-Adjusted Demand</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={fmtINR} tick={{ fontSize:12, fill:'var(--text3)' }} tickLine={false} axisLine={false} width={48}/>
                <Tooltip content={<BarTip/>}/>
                <Legend wrapperStyle={{ fontSize:13 }}/>
                <Bar dataKey="Base"             fill="rgba(155,155,174,0.3)" radius={[4,4,0,0]}/>
                <Bar dataKey="Special Adjusted" fill={chartColor}            radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 2: Christmas calendar card
// ══════════════════════════════════════════════════════════
function ChristmasCalendar() {
  const [year, setYear] = useState(2025)
  const [data, setData] = useState(null)

  const loadYear = async (yr) => {
    try {
      const r = await fetchChristmasDates(yr)
      setData(r)
    } catch {
      // Offline fallback
      const dates = [
        { date:`${yr}-12-24`, label:'Christmas Eve', icon:'🎄', multiplier:1.35, day_of_week: new Date(yr,11,24).toLocaleDateString('en-US',{weekday:'long'}), is_weekend:[0,6].includes(new Date(yr,11,24).getDay()) },
        { date:`${yr}-12-25`, label:'Christmas Day', icon:'🎅', multiplier:0.85, day_of_week: new Date(yr,11,25).toLocaleDateString('en-US',{weekday:'long'}), is_weekend:[0,6].includes(new Date(yr,11,25).getDay()) },
        { date:`${yr}-12-26`, label:'Boxing Day',    icon:'🎁', multiplier:1.20, day_of_week: new Date(yr,11,26).toLocaleDateString('en-US',{weekday:'long'}), is_weekend:[0,6].includes(new Date(yr,11,26).getDay()) },
      ]
      setData({ year:yr, christmas_dates:dates })
    }
  }

  useEffect(() => { loadYear(2025) }, [])
  const changeYear = yr => { setYear(+yr); loadYear(+yr) }

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div>
          <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
            Christmas Cluster Calendar
          </h3>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
            3-day demand pattern around December 25 every year
          </p>
        </div>
        <select value={year} onChange={e=>changeYear(e.target.value)} style={{ ...inp, width:'auto' }}>
          {Array.from({length:15},(_,i)=>2020+i).map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {(data?.christmas_dates||[]).map((d,i) => {
          const c = i===0 ? '#F59E0B' : i===1 ? '#EF4444' : '#10B981'
          return (
            <div key={d.date} style={{ padding:'16px', background:`rgba(${i===0?'245,158,11':i===1?'239,68,68':'16,185,129'},0.07)`, border:`1px solid rgba(${i===0?'245,158,11':i===1?'239,68,68':'16,185,129'},0.25)`, borderRadius:10, position:'relative' }}>
              {/* ✓ tick */}
              <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:`rgba(${i===0?'245,158,11':i===1?'239,68,68':'16,185,129'},0.2)`, border:`1.5px solid ${c}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:c, fontWeight:700 }}>✓</div>
              <p style={{ fontSize:21, margin:'0 0 6px' }}>{d.icon}</p>
              <p style={{ fontSize:13, color:'var(--text3)', letterSpacing:'0.05em', textTransform:'uppercase', margin:'0 0 4px', fontWeight:600 }}>
                {d.date?.slice(5)}
              </p>
              <p style={{ fontFamily:'var(--ff-head)', fontSize:17, fontWeight:700, color:c, margin:'0 0 4px' }}>
                {d.label}
              </p>
              <p style={{ fontSize:12, color:'var(--text3)', margin:'0 0 8px' }}>
                {d.day_of_week?.slice(0,3)}{d.is_weekend?' · Weekend':''}
              </p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'rgba(0,0,0,0.2)', borderRadius:6 }}>
                <span style={{ fontSize:12, color:'var(--text3)' }}>Demand</span>
                <span style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:700, color:c }}>
                  ×{Number(d.multiplier).toFixed(2)}
                </span>
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:6, textAlign:'center' }}>
                {d.multiplier>1 ? `+${Math.round((d.multiplier-1)*100)}% vs normal` : `−${Math.round((1-d.multiplier)*100)}% vs normal`}
              </p>
            </div>
          )
        })}
      </div>

      {/* New Year cards */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:4 }}>
        <p style={{ fontSize:13, color:'var(--text3)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
          New Year Cluster — Dec 31 → Jan 2
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { label:'New Year Eve', icon:'🎆', date:`${year}-12-31`, mult:1.40, color:'#A855F7' },
            { label:'New Year Day', icon:'🎊', date:`${year+1}-01-01`, mult:0.90, color:'#8B5CF6' },
            { label:'Post New Year', icon:'🗓', date:`${year+1}-01-02`, mult:1.15, color:'#7C3AED' },
          ].map((d,i)=>(
            <div key={i} style={{ padding:'12px', background:'rgba(168,85,247,0.07)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:23 }}>{d.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:0 }}>{d.label}</p>
                <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{d.date?.slice(5)}</p>
              </div>
              <span style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:700, color:d.color }}>
                ×{d.mult.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 3: All special days quick reference
// ══════════════════════════════════════════════════════════
function SpecialDaysReference() {
  const rules = [
    { icon:'🎄', label:'Christmas Eve',  date:'Dec 24', mult:1.35, color:'#F59E0B', desc:'Last-minute shopping surge' },
    { icon:'🎅', label:'Christmas Day',  date:'Dec 25', mult:0.85, color:'#EF4444', desc:'Banks closed — lower demand' },
    { icon:'🎁', label:'Boxing Day',     date:'Dec 26', mult:1.20, color:'#10B981', desc:'Post-holiday spending' },
    { icon:'🎆', label:'New Year Eve',   date:'Dec 31', mult:1.40, color:'#A855F7', desc:'Highest surge of the year' },
    { icon:'🎊', label:'New Year Day',   date:'Jan 1',  mult:0.90, color:'#8B5CF6', desc:'Holiday — quiet day' },
    { icon:'🗓', label:'Post New Year',  date:'Jan 2',  mult:1.15, color:'#7C3AED', desc:'Activity resumes' },
    { icon:'🪔', label:'Pre-Diwali',     date:'Varies', mult:1.30, color:'#FBBF24', desc:'Festival preparation withdrawals' },
    { icon:'🪔', label:'Diwali Day',     date:'Oct/Nov',mult:0.85, color:'#F59E0B', desc:'Holiday — lower demand' },
    { icon:'🌕', label:'Poya Day',       date:'Monthly',mult:0.80, color:'#FBBF24', desc:'Sri Lankan full moon holiday' },
    { icon:'🌔', label:'Pre-Poya',       date:'Monthly',mult:1.30, color:'#6EE7B7', desc:'Withdrawal before Poya holiday' },
  ]

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
      <div style={{ marginBottom:16 }}>
        <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16, color:'var(--text)', margin:0 }}>
          All Special Day Multipliers
        </h3>
        <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
          Complete reference — how each special day affects ATM cash demand
        </p>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rules.map((r,i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 150px 70px 1fr 60px', gap:12, alignItems:'center', padding:'10px 14px', background:'var(--bg3)', borderRadius:10 }}>
            <span style={{ fontSize:21 }}>{r.icon}</span>
            <p style={{ fontSize:15, fontWeight:600, color:'var(--text)', margin:0 }}>{r.label}</p>
            <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>{r.date}</p>
            <div>
              <div style={{ height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(r.mult*60,100)}%`, background:r.color, borderRadius:3 }}/>
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{r.desc}</p>
            </div>
            <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:700, color:r.color, textAlign:'right', margin:0 }}>
              ×{r.mult.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
const SUBTABS = ['Predict','Christmas','All Days']

export default function SpecialDaysDashboard() {
  const [tab, setTab] = useState('Predict')

  return (
    <div>
      {/* Banner */}
      <div style={{ padding:'14px 18px', marginBottom:16, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontSize:32, flexShrink:0 }}>🎄</div>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18, color:'var(--text)', margin:'0 0 4px' }}>
            Special Day ATM Prediction
          </h2>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0, lineHeight:1.6 }}>
            Predicts ATM cash demand for <strong style={{ color:'#EF4444' }}>Christmas</strong>,{' '}
            <strong style={{ color:'#A855F7' }}>New Year</strong>, and{' '}
            <strong style={{ color:'#FBBF24' }}>Diwali</strong> clusters.
            Each special day shows a <strong style={{ color:'#EF4444' }}>✓ tick</strong> and adjusts demand automatically —
            {' '}<strong style={{ color:'#EF4444' }}>−15% on Christmas Day</strong>,
            {' '}<strong style={{ color:'#F59E0B' }}>+35% on Christmas Eve</strong>,
            {' '}<strong style={{ color:'#A855F7' }}>+40% on New Year Eve</strong>.
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:16, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:4 }}>
        {SUBTABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'7px 10px', border:'none', cursor:'pointer', borderRadius:8, fontFamily:'var(--ff-body)', fontSize:14, fontWeight:600, transition:'all .15s', background:tab===t?'rgba(239,68,68,0.15)':'transparent', color:tab===t?'#EF4444':'var(--text3)' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Predict'   && <SpecialPredictPanel/>}
      {tab === 'Christmas' && <ChristmasCalendar/>}
      {tab === 'All Days'  && <SpecialDaysReference/>}
    </div>
  )
}

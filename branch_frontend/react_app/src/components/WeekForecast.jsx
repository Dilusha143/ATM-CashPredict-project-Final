// src/components/WeekForecast.jsx
// 7-Day ATM Cash Demand Forecast
// Shows next 7 days for all ATMs with Poya, holiday, salary day flags auto-applied

import { useState, useEffect } from 'react'
import { fetchWeekForecast } from '../utils/api'
import { fmtINR, fmtINRFull } from '../utils/format'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'

// ── Offline Poya data for fallback ─────────────────────────
const POYA_OFFLINE = {
  2025:[[1,13],[2,12],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9],[9,7],[10,7],[11,5],[12,5]],
  2026:[[1,3],[2,1],[3,3],[4,2],[5,1],[5,31],[6,29],[7,29],[8,27],[9,26],[10,25],[11,24],[12,23]],
  2027:[[1,22],[2,20],[3,22],[4,20],[5,20],[6,18],[7,18],[8,16],[9,15],[10,14],[11,13],[12,12]],
}

const ATM_BASE = {
  'Airport ATM':312400,'Big Street ATM':300975,
  'Christ College ATM':287600,'KK Nagar ATM':421300,'Mount Road ATM':298500,
}
const ATM_ZONES = {
  'Airport ATM':'transport','Big Street ATM':'commercial',
  'Christ College ATM':'educational','KK Nagar ATM':'residential','Mount Road ATM':'commercial',
}
const ATMS = Object.keys(ATM_BASE)
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── Offline flag builder ───────────────────────────────────
function buildOfflineDay(dateStr) {
  const dt    = new Date(dateStr + 'T00:00:00')
  const yr    = dt.getFullYear()
  const m     = dt.getMonth() + 1
  const d     = dt.getDate()
  const dow   = dt.getDay()
  const isWknd= dow === 0 || dow === 6

  // Poya check
  const poyaDates = POYA_OFFLINE[yr] || []
  const isPoya    = poyaDates.some(([pm, pd]) => pm === m && pd === d)
  const prevDs = new Date(dt); prevDs.setDate(d - 1)
  const nextDs = new Date(dt); nextDs.setDate(d + 1)
  const isPrePoya  = poyaDates.some(([pm,pd]) =>
    pm === nextDs.getMonth()+1 && pd === nextDs.getDate())
  const isPostPoya = poyaDates.some(([pm,pd]) =>
    pm === prevDs.getMonth()+1 && pd === prevDs.getDate())

  // Sinhala New Year
  const isSinhala     = m === 4 && d === 14
  const isSinhalaEve  = m === 4 && d === 13
  const isSinhalaPre2 = m === 4 && d === 12
  const isSinhalaPost1= m === 4 && d === 15

  // Christmas / New Year
  const isChristmasEve = m === 12 && d === 24
  const isChristmas    = m === 12 && d === 25
  const isBoxingDay    = m === 12 && d === 26
  const isNYEve        = m === 12 && d === 31
  const isNYDay        = m === 1  && d === 1

  // Salary day
  const lastDay = new Date(yr, m, 0).getDate()
  const isSalary = d === 1 || d === lastDay

  // Determine primary label + multiplier
  let label = 'Normal', icon = '📅', color = '#9B9BAE', mult = 1.0

  if      (isPoya)          { label='Poya Day';        icon='🌕'; color='#FBBF24'; mult=0.80 }
  else if (isPrePoya)       { label='Pre-Poya';        icon='🌔'; color='#6EE7B7'; mult=1.30 }
  else if (isPostPoya)      { label='Post-Poya';       icon='🌖'; color='#60A5FA'; mult=1.10 }
  else if (isSinhala)       { label='Sinhala NY';      icon='🌸'; color='#F59E0B'; mult=0.75 }
  else if (isSinhalaEve)    { label='Sinhala NY Eve';  icon='🎉'; color='#EF4444'; mult=1.40 }
  else if (isSinhalaPre2)   { label='Pre Sinhala NY';  icon='🎊'; color='#F59E0B'; mult=1.25 }
  else if (isSinhalaPost1)  { label='Post Sinhala NY'; icon='🙏'; color='#60A5FA'; mult=1.20 }
  else if (isChristmasEve)  { label='Christmas Eve';   icon='🎄'; color='#EF4444'; mult=1.35 }
  else if (isChristmas)     { label='Christmas Day';   icon='🎅'; color='#EF4444'; mult=0.85 }
  else if (isBoxingDay)     { label='Boxing Day';      icon='🎁'; color='#10B981'; mult=1.20 }
  else if (isNYEve)         { label='New Year Eve';    icon='🎆'; color='#A855F7'; mult=1.40 }
  else if (isNYDay)         { label='New Year Day';    icon='🎊'; color='#A855F7'; mult=0.90 }
  else if (isSalary)        { label='Salary Day';      icon='💰'; color='#10B981'; mult=1.22 }
  else if (isWknd)          { label='Weekend';         icon='📅'; color='#9B9BAE'; mult=0.85 }

  const preds = ATMS.map(a => {
    const base = ATM_BASE[a]
    const adj  = Math.round(base * mult)
    return { atm:a, zone:ATM_ZONES[a], base, predicted:adj,
             p10:Math.round(adj*.8), p90:Math.round(adj*1.2) }
  })

  return {
    date:dateStr, day_name:DAYS_FULL[dow], day_short:DAYS_SHORT[dow],
    day_num:d, month_name:dt.toLocaleDateString('en-US',{month:'long'}),
    label, icon, color, multiplier:mult,
    is_weekend:isWknd, is_salary:isSalary,
    is_poya:isPoya, is_special:isSinhala||isChristmas||isNYDay,
    flags: [
      isPoya&&'poya', isPrePoya&&'pre_poya', isPostPoya&&'post_poya',
      isSinhala&&'sinhala', isChristmas&&'christmas',
      isSalary&&'salary', isWknd&&'weekend'
    ].filter(Boolean),
    predictions:preds,
    total_demand:preds.reduce((s,p)=>s+p.predicted,0),
    total_base:  preds.reduce((s,p)=>s+p.base,0),
  }
}

function buildOfflineWeek(startDate) {
  const days = []
  const start = new Date(startDate + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d  = new Date(start); d.setDate(start.getDate() + i)
    const ds = d.toISOString().slice(0, 10)
    days.push(buildOfflineDay(ds))
  }
  return {
    start_date: startDate,
    end_date:   days[6].date,
    days,
    total_7day: days.reduce((s,d)=>s+d.total_demand, 0),
  }
}

// ── Styles ─────────────────────────────────────────────────
const inp = {
  padding:'8px 12px', background:'var(--bg3)',
  border:'1px solid var(--border)', borderRadius:8,
  color:'var(--text)', fontFamily:'var(--ff-body)',
  fontSize:14, outline:'none', appearance:'none', cursor:'pointer',
}

// ── Chart tooltip ──────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)',
      borderRadius:8, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'var(--text2)', marginBottom:6, fontWeight:500 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.fill, margin:'2px 0' }}>
          {p.name}: {fmtINRFull(p.value)}
        </p>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function WeekForecast() {
  const today    = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState('2025-04-12') // default: Sinhala NY week
  const [atmFilter, setAtmFilter] = useState('all')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [offline,   setOffline]   = useState(false)
  const [selDay,    setSelDay]     = useState(null)   // selected day for detail

  useEffect(() => { runForecast('2025-04-12', 'all') }, [])

  const runForecast = async (sd, af) => {
    const useStart = sd || startDate
    const useAtm   = af || atmFilter
    setLoading(true); setSelDay(null)
    try {
      const r = await fetchWeekForecast({ startDate:useStart, atmFilter:useAtm })
      setData(r); setOffline(false)
    } catch {
      setOffline(true)
      setData(buildOfflineWeek(useStart))
    } finally { setLoading(false) }
  }

  // Bar chart data — total network demand per day
  const chartData = (data?.days || []).map(d => ({
    name:  d.day_short + ' ' + d.day_num,
    total: d.total_demand,
    base:  d.total_base,
    color: d.color,
    icon:  d.icon,
    label: d.label,
  }))

  const maxTotal  = data ? Math.max(...data.days.map(d => d.total_demand)) : 0
  const peakDay   = data?.days?.find(d => d.total_demand === maxTotal)
  const lowestDay = data ? data.days.reduce((a,b) => a.total_demand<b.total_demand?a:b) : null
  const specialDays = data?.days?.filter(d => d.label !== 'Normal' && d.label !== 'Weekend') || []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)',
        borderRadius:14, padding:'16px 20px',
        display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontSize:32, flexShrink:0 }}>📅</div>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18,
            color:'var(--text)', margin:'0 0 4px' }}>
            7-Day ATM Cash Demand Forecast
          </h2>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0, lineHeight:1.6 }}>
            Predicts the next 7 days for all ATMs in one view.
            Automatically highlights <span style={{color:'#FBBF24'}}>🌕 Poya days</span>,{' '}
            <span style={{color:'#F59E0B'}}>🌸 Sinhala New Year</span>,{' '}
            <span style={{color:'#EF4444'}}>🎄 Christmas</span>,{' '}
            <span style={{color:'#10B981'}}>💰 Salary days</span> and weekends.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:14, padding:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
              letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:5 }}>
              Start date
            </p>
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ ...inp, width:'100%' }}/>
          </div>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--text3)',
              letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:5 }}>
              ATM
            </p>
            <select value={atmFilter} onChange={e => setAtmFilter(e.target.value)}
              style={{ ...inp, width:'100%' }}>
              <option value="all">All 5 ATMs (network total)</option>
              {ATMS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => runForecast(startDate, atmFilter)} disabled={loading}
            style={{
              padding:'9px 22px',
              background: loading?'var(--bg4)':'linear-gradient(135deg,#60A5FA,#2563EB)',
              color: loading?'var(--text3)':'#fff',
              border:'none', borderRadius:8,
              fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
              cursor: loading?'not-allowed':'pointer', whiteSpace:'nowrap',
            }}>
            {loading ? '⏳…' : '📅 Forecast'}
          </button>
        </div>

        {/* Quick jump buttons */}
        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600,
            letterSpacing:'0.06em', textTransform:'uppercase' }}>Jump to:</span>
          {[
            { label:'Today',         date: new Date().toISOString().slice(0,10) },
            { label:'Sinhala NY',    date:'2025-04-12' },
            { label:'Christmas',     date:'2025-12-23' },
            { label:'New Year',      date:'2025-12-30' },
            { label:'Poya week',     date:'2025-01-11' },
          ].map(q => (
            <button key={q.label} onClick={() => { setStartDate(q.date); runForecast(q.date, atmFilter) }}
              style={{
                padding:'4px 10px', border:'1px solid var(--border)',
                borderRadius:8, background: startDate===q.date?'rgba(96,165,250,0.15)':'var(--bg3)',
                color: startDate===q.date?'#60A5FA':'var(--text3)',
                fontFamily:'var(--ff-body)', fontSize:13, cursor:'pointer',
                transition:'all .15s',
              }}>
              {q.label}
            </button>
          ))}
        </div>

        {offline && (
          <div style={{ marginTop:12, padding:'8px 12px',
            background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)',
            borderRadius:8, fontSize:13, color:'var(--amber)', display:'flex', gap:8 }}>
            <span>⚠️</span>
            <span>Flask API offline — showing estimates using local calendar data.</span>
          </div>
        )}
      </div>

      {/* Summary stat cards */}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { label:'7-day total',  value:fmtINR(data.total_7day),        sub:'network demand',          color:'#60A5FA' },
            { label:'Daily average',value:fmtINR(data.total_7day/7),      sub:'per day avg',             color:'var(--accent)' },
            { label:'Peak day',     value:peakDay?.icon+' '+peakDay?.day_short+' '+peakDay?.day_num,
              sub:fmtINR(peakDay?.total_demand||0),                                                        color:'#FBBF24' },
            { label:'Special days', value:specialDays.length,             sub:'flagged this week',        color:'#EF4444' },
          ].map((c,i) => (
            <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)',
              borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0,
                height:2, background:c.color, opacity:.8 }}/>
              <p style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.06em',
                textTransform:'uppercase', margin:'0 0 6px', fontWeight:600 }}>{c.label}</p>
              <p style={{ fontFamily:'var(--ff-head)', fontSize:23, fontWeight:800,
                color:c.color, letterSpacing:'-0.02em', lineHeight:1, margin:0 }}>{c.value}</p>
              <p style={{ fontSize:13, color:'var(--text3)', marginTop:5 }}>{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart — total network demand per day */}
      {data && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:14, padding:20 }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text2)', marginBottom:4 }}>
            Network cash demand — all ATMs combined
          </p>
          <p style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>
            Bar colour reflects day type — gold = Poya, red = special holiday, green = salary day
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barGap={4}
              margin={{ top:4, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:13, fill:'var(--text3)' }}
                tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={v => fmtINR(v)} tick={{ fontSize:12, fill:'var(--text3)' }}
                tickLine={false} axisLine={false} width={52}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="total" name="Predicted" radius={[5,5,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color}
                    fillOpacity={entry.color==='#9B9BAE' ? 0.5 : 0.85}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Main 7-day table ── */}
      {data && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:14, overflow:'hidden' }}>

          {/* Table header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16,
              color:'var(--text)', margin:0 }}>
              Day-by-day forecast table
            </p>
            <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>
              Click any row for ATM breakdown
            </p>
          </div>

          {/* Day rows */}
          {data.days.map((day, i) => {
            const isSel    = selDay?.date === day.date
            const isToday  = day.date === new Date().toISOString().slice(0,10)
            const diffPct  = ((day.total_demand - day.total_base) / day.total_base * 100).toFixed(0)

            return (
              <div key={day.date}>
                {/* Main row */}
                <div onClick={() => setSelDay(isSel ? null : day)}
                  style={{
                    display:'grid',
                    gridTemplateColumns:'110px 140px 1fr 90px 90px 80px',
                    gap:12, alignItems:'center',
                    padding:'13px 20px',
                    background: isSel ? `${day.color}11` : 'transparent',
                    borderLeft: `3px solid ${isSel ? day.color : 'transparent'}`,
                    borderBottom:'1px solid var(--border)',
                    cursor:'pointer', transition:'all .15s',
                  }}
                  onMouseOver={e => { if(!isSel) e.currentTarget.style.background='var(--bg3)' }}
                  onMouseOut={e  => { if(!isSel) e.currentTarget.style.background='transparent' }}>

                  {/* Date cell */}
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600,
                        color:isToday?'var(--accent)':'var(--text)', margin:0 }}>
                        {day.day_short}
                      </p>
                      <p style={{ fontFamily:'var(--ff-mono)', fontSize:14,
                        color:'var(--text3)', margin:0 }}>
                        {day.date.slice(5)}
                      </p>
                    </div>
                    {isToday && (
                      <span style={{ fontSize:11, fontWeight:600, padding:'1px 5px',
                        borderRadius:4, background:'var(--accent-dim)',
                        color:'var(--accent)', letterSpacing:'0.05em' }}>TODAY</span>
                    )}
                  </div>

                  {/* Flag / label cell */}
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:18 }}>{day.icon}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:day.color }}>
                      {day.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ height:6, background:'var(--bg4)',
                      borderRadius:3, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:3,
                        width:`${Math.round(day.total_demand/maxTotal*100)}%`,
                        background:day.color,
                        transition:'width .6s cubic-bezier(.4,0,.2,1)',
                      }}/>
                    </div>
                    <p style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                      {Math.round(day.total_demand/maxTotal*100)}% of week peak
                    </p>
                  </div>

                  {/* Base total */}
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:13,
                      color:'var(--text3)', margin:0,
                      textDecoration: day.multiplier!==1?'line-through':'none' }}>
                      {fmtINR(day.total_base)}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>base</p>
                  </div>

                  {/* Adjusted total */}
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:600,
                      color:day.color, margin:0 }}>
                      {fmtINR(day.total_demand)}
                    </p>
                    <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>adjusted</p>
                  </div>

                  {/* % change */}
                  <div style={{ textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, fontWeight:600, margin:0,
                      color:Number(diffPct)>0?'var(--accent)':Number(diffPct)<0?'var(--rose)':'var(--text3)' }}>
                      {Number(diffPct)>0?'+':''}{diffPct}%
                    </p>
                    <span style={{ fontSize:14, color:'var(--text3)', transform: isSel?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
                  </div>
                </div>

                {/* Expanded ATM breakdown */}
                {isSel && (
                  <div style={{ padding:'14px 20px 16px',
                    background:`${day.color}08`,
                    borderBottom:'1px solid var(--border)' }}>

                    {/* Day summary strip */}
                    <div style={{ padding:'10px 14px', marginBottom:12,
                      background:day.color+'18',
                      border:`1px solid ${day.color}33`,
                      borderRadius:10,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:25 }}>{day.icon}</span>
                        <div>
                          <p style={{ fontSize:15, fontWeight:600, color:'var(--text)', margin:0 }}>
                            {day.day_name}, {day.date}
                          </p>
                          <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>
                            {day.label}
                            {day.is_salary ? ' · 💰 Salary day' : ''}
                            {day.is_weekend ? ' · Weekend' : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontFamily:'var(--ff-mono)', fontSize:18, fontWeight:700,
                          color:day.color, margin:0 }}>×{day.multiplier}</p>
                        <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>demand multiplier</p>
                      </div>
                    </div>

                    {/* Per-ATM breakdown grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                      {day.predictions.map(p => {
                        const pDiff = ((p.predicted - p.base) / p.base * 100).toFixed(0)
                        return (
                          <div key={p.atm} style={{ background:'var(--bg3)',
                            border:'1px solid var(--border)',
                            borderRadius:10, padding:'10px 12px' }}>
                            <p style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                              margin:'0 0 4px', lineHeight:1.3 }}>
                              {p.atm.replace(' ATM','')}
                            </p>
                            <p style={{ fontSize:11, color:'var(--text3)', margin:'0 0 8px' }}>
                              {p.zone}
                            </p>
                            <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:700,
                              color:day.color, margin:'0 0 2px' }}>{fmtINR(p.predicted)}</p>
                            <p style={{ fontFamily:'var(--ff-mono)', fontSize:12,
                              color:'var(--text3)', margin:'0 0 6px',
                              textDecoration:'line-through' }}>{fmtINR(p.base)}</p>
                            {/* P10/P90 band */}
                            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>{fmtINR(p.p10)}</span>
                              <div style={{ flex:1, height:3, background:'var(--bg4)',
                                borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', background:day.color,
                                  width:'60%', borderRadius:2 }}/>
                              </div>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>{fmtINR(p.p90)}</span>
                            </div>
                            <p style={{ fontSize:11, color:'var(--text3)', margin:'3px 0 0', textAlign:'center' }}>
                              P10 — P90
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Table footer */}
          <div style={{ padding:'12px 20px',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              {[
                { color:'#FBBF24', label:'Poya day' },
                { color:'#F59E0B', label:'Sinhala New Year' },
                { color:'#EF4444', label:'Christmas / special' },
                { color:'#10B981', label:'Salary day' },
                { color:'#9B9BAE', label:'Weekend / normal' },
              ].map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:l.color }}/>
                  <span style={{ fontSize:12, color:'var(--text3)' }}>{l.label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize:13, color:'var(--text3)', margin:0, flexShrink:0 }}>
              Click any row to expand ATM details
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

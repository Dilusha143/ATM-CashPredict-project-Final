// src/components/CashAlerts.jsx
// Low Cash Alert System
// Bank enters current cash loaded in each ATM.
// System compares against 7-day forecast and raises CRITICAL / WARNING / OK alerts.

import { useState, useEffect } from 'react'
import { fetchCashLevels, saveCashLevels, fetchAlerts } from '../utils/api'
import { fmtINR, fmtINRFull } from '../utils/format'

// ── ATM reference data ─────────────────────────────────────
const ATMS = [
  { name:'Airport ATM',        zone:'transport',   icon:'✈️'  },
  { name:'Big Street ATM',     zone:'commercial',  icon:'🏪'  },
  { name:'Christ College ATM', zone:'educational', icon:'🎓'  },
  { name:'KK Nagar ATM',       zone:'residential', icon:'🏘'  },
  { name:'Mount Road ATM',     zone:'commercial',  icon:'🛣'  },
]

// Default starting cash levels (Rs.)
const DEFAULT_LEVELS = {
  'Airport ATM':        500000,
  'Big Street ATM':     600000,
  'Christ College ATM': 400000,
  'KK Nagar ATM':       700000,
  'Mount Road ATM':     450000,
}

// ── Severity config ────────────────────────────────────────
const SEV = {
  CRITICAL: { color:'#EF4444', bg:'rgba(239,68,68,0.10)', border:'rgba(239,68,68,0.30)', icon:'🔴', label:'CRITICAL' },
  WARNING:  { color:'#F59E0B', bg:'rgba(245,158,11,0.10)', border:'rgba(245,158,11,0.30)', icon:'🟡', label:'WARNING'  },
  OK:       { color:'#10B981', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.25)', icon:'🟢', label:'OK'       },
  NO_DATA:  { color:'#9B9BAE', bg:'rgba(155,155,174,0.08)', border:'rgba(155,155,174,0.2)', icon:'⚪', label:'NO DATA'  },
}

// ── Offline day builder ────────────────────────────────────
const POYA_OFFLINE = {
  2025:[[1,13],[2,12],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9],[9,7],[10,7],[11,5],[12,5]],
  2026:[[1,3],[2,1],[3,3],[4,2],[5,1],[5,31],[6,29],[7,29],[8,27],[9,26],[10,25],[11,24],[12,23]],
}
const ATM_BASE = {
  'Airport ATM':312400,'Big Street ATM':300975,
  'Christ College ATM':287600,'KK Nagar ATM':421300,'Mount Road ATM':298500,
}
const ATM_ZONES = {
  'Airport ATM':'transport','Big Street ATM':'commercial',
  'Christ College ATM':'educational','KK Nagar ATM':'residential','Mount Road ATM':'commercial',
}
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function offlineMult(dateStr) {
  const dt   = new Date(dateStr + 'T00:00:00')
  const yr   = dt.getFullYear(), m = dt.getMonth()+1, d = dt.getDate(), dow = dt.getDay()
  const poya = (POYA_OFFLINE[yr]||[])
  const isPoya    = poya.some(([pm,pd])=>pm===m&&pd===d)
  const nextD = new Date(dt); nextD.setDate(d+1)
  const prevD = new Date(dt); prevD.setDate(d-1)
  const isPrePoya = poya.some(([pm,pd])=>pm===nextD.getMonth()+1&&pd===nextD.getDate())
  const isSinhala = m===4&&d===14, isSinhalaEve=m===4&&d===13
  const isChristmas=m===12&&d===25, isChristmasEve=m===12&&d===24
  const isNYEve=m===12&&d===31, isNYDay=m===1&&d===1
  const lastDay=new Date(yr,m,0).getDate()
  const isSalary=d===1||d===lastDay
  const isWknd=dow===0||dow===6

  let mult=1.0, label='Normal', icon='📅', color='#9B9BAE'
  if(isPoya)         { mult=0.80; label='Poya Day';      icon='🌕'; color='#FBBF24' }
  else if(isPrePoya) { mult=1.30; label='Pre-Poya';      icon='🌔'; color='#6EE7B7' }
  else if(isSinhala) { mult=0.75; label='Sinhala NY';    icon='🌸'; color='#F59E0B' }
  else if(isSinhalaEve){ mult=1.40;label='Sinhala NY Eve';icon='🎉';color='#EF4444' }
  else if(isChristmas) { mult=0.85;label='Christmas';    icon='🎅'; color='#EF4444' }
  else if(isChristmasEve){mult=1.35;label='Christmas Eve';icon='🎄';color='#F59E0B'}
  else if(isNYEve)   { mult=1.40; label='New Year Eve';  icon='🎆'; color='#A855F7' }
  else if(isNYDay)   { mult=0.90; label='New Year Day';  icon='🎊'; color='#A855F7' }
  else if(isSalary)  { mult=1.22; label='Salary Day';    icon='💰'; color='#10B981' }
  else if(isWknd)    { mult=0.85; label='Weekend';       icon='📅'; color='#9B9BAE' }
  return { mult, label, icon, color,
    day_short:DAYS_SHORT[dow], day_name:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow] }
}

function buildOfflineAlerts(startDate, days, cashLevels) {
  const result = []
  const start  = new Date(startDate+'T00:00:00')
  let summary  = { critical:0, warning:0, ok:0, total_days:days }

  for(let i=0;i<days;i++) {
    const d  = new Date(start); d.setDate(start.getDate()+i)
    const ds = d.toISOString().slice(0,10)
    const info = offlineMult(ds)

    const atm_alerts = Object.keys(ATM_BASE).map(atm => {
      const base    = ATM_BASE[atm]
      const pred    = Math.round(base * info.mult)
      const p90     = Math.round(pred * 1.20)
      const loaded  = cashLevels[atm] || 0
      const shortfall = Math.max(0, pred-loaded)
      const pct     = loaded>0 ? +(pred/loaded*100).toFixed(1) : null
      let severity  = loaded===0?'NO_DATA':pred>loaded?'CRITICAL':pred>loaded*.75?'WARNING':'OK'
      if(severity==='CRITICAL') summary.critical++
      else if(severity==='WARNING') summary.warning++
      else if(severity==='OK') summary.ok++
      return { atm, zone:ATM_ZONES[atm], loaded, predicted:pred, p90, shortfall,
               p90_shortfall:Math.max(0,p90-loaded), usage_pct:pct, severity, needs_refill:shortfall>0 }
    })

    result.push({
      date:ds, ...info,
      day_num:d.getDate(), month_name:d.toLocaleDateString('en-US',{month:'short'}),
      atm_alerts,
      critical_count:atm_alerts.filter(a=>a.severity==='CRITICAL').length,
      warning_count: atm_alerts.filter(a=>a.severity==='WARNING').length,
      total_refill:  atm_alerts.reduce((s,a)=>s+a.shortfall,0),
      has_issue:     atm_alerts.some(a=>['CRITICAL','WARNING'].includes(a.severity)),
    })
  }
  return { start_date:startDate, days:result, summary,
           cash_levels:cashLevels, has_alerts:summary.critical>0||summary.warning>0 }
}

// ── Styles ─────────────────────────────────────────────────
const inp = {
  padding:'8px 12px', background:'var(--bg3)',
  border:'1px solid var(--border)', borderRadius:8,
  color:'var(--text)', fontFamily:'var(--ff-body)',
  fontSize:14, outline:'none', appearance:'none',
}

// ══════════════════════════════════════════════════════════
// SECTION 1 — Cash Level Input Panel
// ══════════════════════════════════════════════════════════
function CashLevelPanel({ levels, onChange, onSave, saving }) {
  const totalLoaded = Object.values(levels).reduce((s,v)=>s+(+v||0),0)

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:14, padding:20 }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16,
            color:'var(--text)', margin:0 }}>
            💵 Current Cash Loaded in ATMs
          </h3>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
            Enter how much cash is currently loaded in each ATM (in Rupees)
          </p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontFamily:'var(--ff-mono)', fontSize:21, fontWeight:700,
            color:'var(--accent)', margin:0 }}>
            {fmtINR(totalLoaded)}
          </p>
          <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>total loaded</p>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {ATMS.map(atm => (
          <div key={atm.name} style={{
            display:'grid', gridTemplateColumns:'36px 1fr 160px 80px',
            gap:12, alignItems:'center',
            padding:'10px 14px', background:'var(--bg3)',
            border:'1px solid var(--border)', borderRadius:10,
          }}>
            <span style={{ fontSize:23 }}>{atm.icon}</span>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>{atm.name}</p>
              <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{atm.zone}</p>
            </div>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%',
                transform:'translateY(-50%)', fontSize:14, color:'var(--text3)' }}>Rs.</span>
              <input
                type="number" min="0" step="10000"
                value={levels[atm.name] || ''}
                onChange={e => onChange(atm.name, e.target.value)}
                placeholder="0"
                style={{ ...inp, width:'100%', paddingLeft:34, fontFamily:'var(--ff-mono)' }}
              />
            </div>
            <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, fontWeight:600,
              color:'var(--accent)', margin:0, textAlign:'right' }}>
              {fmtINR(levels[atm.name] || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Quick preset buttons */}
      <div style={{ display:'flex', gap:8, marginTop:14, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600,
          letterSpacing:'0.06em', textTransform:'uppercase' }}>Quick set:</span>
        {[
          { label:'Rs.3L each',  val:300000 },
          { label:'Rs.5L each',  val:500000 },
          { label:'Rs.7L each',  val:700000 },
          { label:'Rs.10L each', val:1000000 },
        ].map(p => (
          <button key={p.label} onClick={() => ATMS.forEach(a => onChange(a.name, p.val))}
            style={{ padding:'4px 10px', border:'1px solid var(--border)',
              borderRadius:8, background:'var(--bg4)', color:'var(--text3)',
              fontFamily:'var(--ff-body)', fontSize:13, cursor:'pointer',
              transition:'all .15s' }}
            onMouseOver={e=>e.currentTarget.style.borderColor='var(--accent)'}
            onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
            {p.label}
          </button>
        ))}
        <button onClick={() => ATMS.forEach(a => onChange(a.name, 0))}
          style={{ padding:'4px 10px', border:'1px solid rgba(251,113,133,0.3)',
            borderRadius:8, background:'rgba(251,113,133,0.08)', color:'var(--rose)',
            fontFamily:'var(--ff-body)', fontSize:13, cursor:'pointer' }}>
          Clear all
        </button>
      </div>

      <button onClick={onSave} disabled={saving} style={{
        marginTop:14, width:'100%', padding:'11px',
        background: saving?'var(--bg4)':'linear-gradient(135deg,var(--accent),#059669)',
        color: saving?'var(--text3)':'#021a10',
        border:'none', borderRadius:8,
        fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
        cursor: saving?'not-allowed':'pointer',
      }}>
        {saving ? '⏳ Saving…' : '💾 Save Cash Levels'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SECTION 2 — Alert Results
// ══════════════════════════════════════════════════════════
function AlertResults({ data, levels }) {
  const [expandedDay, setExpandedDay] = useState(null)

  if (!data) return null

  const { days, summary, has_alerts } = data
  const maxRefill = Math.max(...days.map(d => d.total_refill), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Summary banner */}
      <div style={{
        padding:'16px 20px', borderRadius:14,
        background: summary.critical>0 ? 'rgba(239,68,68,0.08)' :
                    summary.warning>0  ? 'rgba(245,158,11,0.08)' :
                                         'rgba(16,185,129,0.08)',
        border: `1px solid ${summary.critical>0?'rgba(239,68,68,0.3)':summary.warning>0?'rgba(245,158,11,0.3)':'rgba(16,185,129,0.3)'}`,
        display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
      }}>
        <div style={{ fontSize:36, flexShrink:0 }}>
          {summary.critical>0?'🚨':summary.warning>0?'⚠️':'✅'}
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17,
            color:'var(--text)', margin:'0 0 4px' }}>
            {summary.critical>0
              ? `${summary.critical} CRITICAL alert${summary.critical>1?'s':''} — ATMs need refilling`
              : summary.warning>0
              ? `${summary.warning} WARNING${summary.warning>1?'s':''} — Monitor closely`
              : 'All ATMs have sufficient cash for the forecast period'}
          </p>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0 }}>
            {summary.total_days} days checked · {summary.critical} critical ·{' '}
            {summary.warning} warnings · {summary.ok} OK
          </p>
        </div>
        <div style={{ display:'flex', gap:12, flexShrink:0 }}>
          {[
            { label:'Critical', count:summary.critical, color:'#EF4444' },
            { label:'Warning',  count:summary.warning,  color:'#F59E0B' },
            { label:'OK',       count:summary.ok,        color:'#10B981' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <p style={{ fontFamily:'var(--ff-mono)', fontSize:25, fontWeight:700,
                color:s.color, margin:0, lineHeight:1 }}>{s.count}</p>
              <p style={{ fontSize:12, color:'var(--text3)', margin:'3px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-day alert table */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:14, overflow:'hidden' }}>

        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <p style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16,
            color:'var(--text)', margin:0 }}>Alert details — day by day</p>
          <p style={{ fontSize:13, color:'var(--text3)', margin:0 }}>
            Click any row to see ATM breakdown
          </p>
        </div>

        {days.map((day, i) => {
          const isExp = expandedDay === day.date
          const worstSev = day.critical_count>0?'CRITICAL':day.warning_count>0?'WARNING':'OK'
          const sc = SEV[worstSev]

          return (
            <div key={day.date}>
              {/* Row */}
              <div onClick={() => setExpandedDay(isExp?null:day.date)}
                style={{
                  display:'grid',
                  gridTemplateColumns:'100px 130px 1fr 100px 110px 90px',
                  gap:12, alignItems:'center', padding:'12px 20px',
                  background: isExp?`${sc.color}0A`:'transparent',
                  borderLeft:`3px solid ${isExp?sc.color:'transparent'}`,
                  borderBottom:'1px solid var(--border)',
                  cursor:'pointer', transition:'all .15s',
                }}
                onMouseOver={e=>{ if(!isExp) e.currentTarget.style.background='var(--bg3)' }}
                onMouseOut={e=>{  if(!isExp) e.currentTarget.style.background='transparent' }}>

                {/* Date */}
                <div>
                  <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600,
                    color:'var(--text)', margin:0 }}>
                    {day.day_short} {day.date?.slice(5)}
                  </p>
                  <p style={{ fontSize:12, color:'var(--text3)', margin:0 }}>{day.day_name?.slice(0,3)}</p>
                </div>

                {/* Day type */}
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:16 }}>{day.icon}</span>
                  <span style={{ fontSize:13, color:day.color, fontWeight:600 }}>
                    {day.label}
                  </span>
                </div>

                {/* Refill bar */}
                <div>
                  <div style={{ height:5, background:'var(--bg4)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:3,
                      width:`${Math.min(day.total_refill/maxRefill*100,100)}%`,
                      background: worstSev==='CRITICAL'?'#EF4444':worstSev==='WARNING'?'#F59E0B':'#10B981',
                      transition:'width .5s',
                    }}/>
                  </div>
                  <p style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                    {day.total_refill>0 ? `Rs.${fmtINR(day.total_refill)} total shortfall` : 'No shortfall'}
                  </p>
                </div>

                {/* Alert counts */}
                <div style={{ display:'flex', gap:6 }}>
                  {day.critical_count>0 && (
                    <span style={{ fontSize:13, fontWeight:600, padding:'2px 8px',
                      borderRadius:20, background:'rgba(239,68,68,0.15)', color:'#EF4444' }}>
                      🔴 {day.critical_count}
                    </span>
                  )}
                  {day.warning_count>0 && (
                    <span style={{ fontSize:13, fontWeight:600, padding:'2px 8px',
                      borderRadius:20, background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>
                      🟡 {day.warning_count}
                    </span>
                  )}
                  {day.critical_count===0&&day.warning_count===0 && (
                    <span style={{ fontSize:13, fontWeight:600, padding:'2px 8px',
                      borderRadius:20, background:'rgba(16,185,129,0.12)', color:'#10B981' }}>
                      🟢 OK
                    </span>
                  )}
                </div>

                {/* Total refill needed */}
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600,
                    color: day.total_refill>0?'#EF4444':'#10B981', margin:0 }}>
                    {day.total_refill>0 ? fmtINR(day.total_refill) : '—'}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text3)', margin:0 }}>needed</p>
                </div>

                {/* Expand arrow */}
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontSize:14, color:'var(--text3)',
                    display:'inline-block',
                    transform:isExp?'rotate(180deg)':'none',
                    transition:'transform .2s' }}>▾</span>
                </div>
              </div>

              {/* Expanded ATM detail */}
              {isExp && (
                <div style={{ padding:'14px 20px 18px',
                  background:`${sc.color}06`,
                  borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                    {day.atm_alerts.map(a => {
                      const sc2 = SEV[a.severity]
                      return (
                        <div key={a.atm} style={{
                          background:sc2.bg, border:`1px solid ${sc2.border}`,
                          borderRadius:10, padding:'12px',
                          position:'relative', overflow:'hidden',
                        }}>
                          {/* Severity stripe */}
                          <div style={{ position:'absolute', top:0, left:0, right:0,
                            height:3, background:sc2.color }}/>

                          <div style={{ display:'flex', alignItems:'center',
                            justifyContent:'space-between', marginBottom:8 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)',
                              margin:0, lineHeight:1.3 }}>
                              {a.atm.replace(' ATM','')}
                            </p>
                            <span style={{ fontSize:14 }}>{sc2.icon}</span>
                          </div>

                          {/* Cash gauge */}
                          <div style={{ marginBottom:8 }}>
                            <div style={{ display:'flex', justifyContent:'space-between',
                              marginBottom:3 }}>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>Loaded</span>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>
                                {a.usage_pct !== null ? `${a.usage_pct}% used` : 'No data'}
                              </span>
                            </div>
                            <div style={{ height:8, background:'var(--bg4)',
                              borderRadius:4, overflow:'hidden' }}>
                              <div style={{
                                height:'100%', borderRadius:4,
                                width:`${Math.min((a.predicted/(a.loaded||1))*100,100)}%`,
                                background: sc2.color, transition:'width .5s',
                              }}/>
                            </div>
                          </div>

                          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ fontSize:12, color:'var(--text3)' }}>Loaded</span>
                              <span style={{ fontFamily:'var(--ff-mono)', fontSize:13,
                                color:'var(--text)', fontWeight:500 }}>{fmtINR(a.loaded)}</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ fontSize:12, color:'var(--text3)' }}>Predicted</span>
                              <span style={{ fontFamily:'var(--ff-mono)', fontSize:13,
                                color:sc2.color, fontWeight:600 }}>{fmtINR(a.predicted)}</span>
                            </div>
                            {a.shortfall>0 && (
                              <div style={{ display:'flex', justifyContent:'space-between',
                                padding:'4px 8px', background:'rgba(239,68,68,0.1)',
                                borderRadius:6, marginTop:2 }}>
                                <span style={{ fontSize:12, color:'#EF4444', fontWeight:600 }}>
                                  Shortfall
                                </span>
                                <span style={{ fontFamily:'var(--ff-mono)', fontSize:13,
                                  color:'#EF4444', fontWeight:700 }}>{fmtINR(a.shortfall)}</span>
                              </div>
                            )}
                            <div style={{ display:'flex', justifyContent:'space-between',
                              marginTop:2 }}>
                              <span style={{ fontSize:11, color:'var(--text3)' }}>P90 risk</span>
                              <span style={{ fontFamily:'var(--ff-mono)', fontSize:12,
                                color:'var(--text3)' }}>{fmtINR(a.p90)}</span>
                            </div>
                          </div>

                          {/* Severity badge */}
                          <div style={{ marginTop:8, textAlign:'center' }}>
                            <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px',
                              borderRadius:20, background:sc2.bg, color:sc2.color,
                              border:`1px solid ${sc2.border}`, letterSpacing:'0.06em' }}>
                              {sc2.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Footer legend */}
        <div style={{ padding:'12px 20px', display:'flex', gap:16, flexWrap:'wrap' }}>
          {Object.entries(SEV).filter(([k])=>k!=='NO_DATA').map(([k,v])=>(
            <div key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:14 }}>{v.icon}</span>
              <span style={{ fontSize:12, color:'var(--text3)' }}>
                {v.label}
                {k==='CRITICAL'&&' — predicted > loaded cash'}
                {k==='WARNING'&&' — predicted > 75% of loaded cash'}
                {k==='OK'&&' — sufficient cash loaded'}
              </span>
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
export default function CashAlerts() {
  const today = new Date().toISOString().slice(0, 10)

  const [levels,    setLevels]    = useState(DEFAULT_LEVELS)
  const [startDate, setStartDate] = useState('2025-04-12')
  const [days,      setDays]      = useState(7)
  const [alertData, setAlertData] = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [offline,   setOffline]   = useState(false)
  const [saveMsg,   setSaveMsg]   = useState(null)

  // Load saved levels from server on mount
  useEffect(() => {
    fetchCashLevels()
      .then(d => { if(d.cash_levels) setLevels(d.cash_levels) })
      .catch(() => {})   // stay with defaults if offline
  }, [])

  const handleLevelChange = (atm, val) => {
    setLevels(prev => ({ ...prev, [atm]: +val || 0 }))
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      await saveCashLevels(levels)
      setSaveMsg({ type:'ok', text:'Cash levels saved to server ✓' })
    } catch {
      setSaveMsg({ type:'warn', text:'Saved locally (Flask offline)' })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const handleRunAlerts = async () => {
    setLoading(true)
    try {
      const r = await fetchAlerts({ startDate, days, cashLevels: levels })
      setAlertData(r); setOffline(false)
    } catch {
      setOffline(true)
      setAlertData(buildOfflineAlerts(startDate, days, levels))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header banner */}
      <div style={{ padding:'16px 20px', background:'rgba(239,68,68,0.06)',
        border:'1px solid rgba(239,68,68,0.2)', borderRadius:14,
        display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontSize:32, flexShrink:0 }}>🚨</div>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18,
            color:'var(--text)', margin:'0 0 4px' }}>
            Low Cash Alert System
          </h2>
          <p style={{ fontSize:14, color:'var(--text3)', margin:0, lineHeight:1.6 }}>
            Enter the current cash loaded in each ATM. The system compares against the
            XGBoost forecast for the next 7 days (including Poya, Sinhala New Year,
            Christmas &amp; salary day adjustments) and raises{' '}
            <strong style={{ color:'#EF4444' }}>🔴 CRITICAL</strong> or{' '}
            <strong style={{ color:'#F59E0B' }}>🟡 WARNING</strong> alerts when an ATM
            may run out of cash.
          </p>
        </div>
      </div>

      {offline && (
        <div style={{ padding:'8px 14px', background:'rgba(251,191,36,0.08)',
          border:'1px solid rgba(251,191,36,0.2)', borderRadius:8,
          fontSize:13, color:'var(--amber)', display:'flex', gap:8 }}>
          <span>⚠️</span>
          <span>Flask API offline — using local calendar + base demand estimates.</span>
        </div>
      )}

      {/* Cash level input */}
      <CashLevelPanel
        levels={levels}
        onChange={handleLevelChange}
        onSave={handleSave}
        saving={saving}
      />

      {saveMsg && (
        <div style={{ padding:'8px 14px',
          background: saveMsg.type==='ok'?'rgba(16,185,129,0.08)':'rgba(251,191,36,0.08)',
          border:`1px solid ${saveMsg.type==='ok'?'rgba(16,185,129,0.25)':'rgba(251,191,36,0.25)'}`,
          borderRadius:8, fontSize:14,
          color: saveMsg.type==='ok'?'#10B981':'var(--amber)' }}>
          {saveMsg.text}
        </div>
      )}

      {/* Alert check controls */}
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:14, padding:20 }}>
        <h3 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:16,
          color:'var(--text)', margin:'0 0 14px' }}>
          🔍 Run Alert Check
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 140px auto', gap:12, alignItems:'end' }}>
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
              Days to check
            </p>
            <select value={days} onChange={e => setDays(+e.target.value)}
              style={{ ...inp, width:'100%' }}>
              {[3,5,7,10,14].map(n=>(
                <option key={n} value={n}>{n} days</option>
              ))}
            </select>
          </div>
          <button onClick={handleRunAlerts} disabled={loading} style={{
            padding:'9px 22px',
            background: loading?'var(--bg4)':'linear-gradient(135deg,#EF4444,#DC2626)',
            color: loading?'var(--text3)':'#fff',
            border:'none', borderRadius:8,
            fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
            cursor: loading?'not-allowed':'pointer', whiteSpace:'nowrap',
          }}>
            {loading ? '⏳ Checking…' : '🚨 Check Alerts'}
          </button>
        </div>

        {/* Quick jump buttons */}
        <div style={{ display:'flex', gap:6, marginTop:12, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600,
            letterSpacing:'0.06em', textTransform:'uppercase' }}>Quick:</span>
          {[
            { label:'This week',  date:today },
            { label:'Sinhala NY', date:'2025-04-12' },
            { label:'Christmas',  date:'2025-12-23' },
            { label:'New Year',   date:'2025-12-30' },
            { label:'Poya week',  date:'2025-01-11' },
          ].map(q=>(
            <button key={q.label}
              onClick={()=>{ setStartDate(q.date); }}
              style={{ padding:'4px 10px', border:'1px solid var(--border)',
                borderRadius:8,
                background:startDate===q.date?'rgba(239,68,68,0.12)':'var(--bg3)',
                color:startDate===q.date?'#EF4444':'var(--text3)',
                fontFamily:'var(--ff-body)', fontSize:13, cursor:'pointer' }}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert results */}
      {alertData && <AlertResults data={alertData} levels={levels} />}
    </div>
  )
}

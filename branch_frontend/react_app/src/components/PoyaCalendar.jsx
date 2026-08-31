// src/components/PoyaCalendar.jsx
// Full year calendar grid — tick any day to mark as Poya, auto-predict on tick.

import { useState, useEffect, useCallback } from 'react'
import { fetchPoyaCalendar, setPoyaDay, fetchPoyaAllPreds } from '../utils/api'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su']

function fmtINR(n) {
  if (!n) return '—'
  if (n >= 1e5) return `Rs.${(n/1e5).toFixed(1)}L`
  return `Rs.${(n/1e3).toFixed(0)}K`
}

export default function PoyaCalendar() {
  const [year,       setYear]       = useState(2017)
  const [calendar,   setCalendar]   = useState([])
  const [poyaPreds,  setPoyaPreds]  = useState([])
  const [loading,    setLoading]    = useState(false)
  const [predLoading,setPredLoading]= useState(false)
  const [toggling,   setToggling]   = useState(null)
  const [toast,      setToast]      = useState(null)
  const [view,       setView]       = useState('calendar') // 'calendar' | 'predictions'

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPoyaCalendar(year)
      setCalendar(data.days || [])
    } catch (e) {
      showToast('Failed to load calendar: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [year])

  const loadPredictions = useCallback(async () => {
    setPredLoading(true)
    try {
      const data = await fetchPoyaAllPreds(year)
      setPoyaPreds(data.poya_predictions || [])
    } catch (e) {
      showToast('Failed to load predictions: ' + e.message, 'error')
    } finally {
      setPredLoading(false)
    }
  }, [year])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleTick = async (dateStr, currentIsP) => {
    setToggling(dateStr)
    try {
      const newFlag = !currentIsP
      await setPoyaDay(dateStr, newFlag)
      // Update local calendar state immediately
      setCalendar(prev =>
        prev.map(d => d.date === dateStr
          ? { ...d, is_poya: newFlag, user_set: true }
          : d
        )
      )
      showToast(
        newFlag
          ? `✓ ${dateStr} marked as Poya day`
          : `✕ ${dateStr} unmarked`,
        newFlag ? 'success' : 'info'
      )
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      setToggling(null)
    }
  }

  // Group calendar days by month
  const byMonth = {}
  calendar.forEach(d => {
    if (!byMonth[d.month]) byMonth[d.month] = []
    byMonth[d.month].push(d)
  })

  const totalPoya = calendar.filter(d => d.is_poya).length

  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:'var(--r-xl)', padding:'24px', position:'relative',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:999,
          padding:'12px 20px', borderRadius:'var(--r)',
          background: toast.type==='error' ? 'var(--rose-dim)' :
                      toast.type==='info'  ? 'var(--blue-dim)' : 'var(--accent-dim)',
          border:`1px solid ${toast.type==='error' ? 'rgba(251,113,133,0.3)' :
                               toast.type==='info'  ? 'rgba(96,165,250,0.3)'  : 'rgba(110,231,183,0.3)'}`,
          color: toast.type==='error' ? 'var(--rose)' :
                 toast.type==='info'  ? 'var(--blue)' : 'var(--accent)',
          fontSize:15, fontWeight:500,
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18, color:'var(--text)' }}>
            Poya Day Calendar
          </h2>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>
            {totalPoya} Poya days in {year} — click any day to tick/untick as Poya
          </p>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Year selector */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => setYear(y => y-1)} style={arrowBtn}>‹</button>
            <span style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:500, color:'var(--text)', minWidth:40, textAlign:'center' }}>{year}</span>
            <button onClick={() => setYear(y => y+1)} style={arrowBtn}>›</button>
          </div>

          {/* View toggle */}
          <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:3 }}>
            {['calendar','predictions'].map(v => (
              <button key={v} onClick={() => { setView(v); if(v==='predictions') loadPredictions() }}
                style={{
                  padding:'6px 14px', border:'none', cursor:'pointer',
                  borderRadius:'calc(var(--r) - 3px)',
                  fontFamily:'var(--ff-body)', fontSize:13, fontWeight:600,
                  background: view===v ? 'var(--bg4)' : 'transparent',
                  color:      view===v ? 'var(--text)' : 'var(--text3)',
                  textTransform:'capitalize',
                }}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { color:'rgba(110,231,183,0.3)', border:'rgba(110,231,183,0.6)', label:'Poya day (built-in)' },
          { color:'rgba(96,165,250,0.3)',  border:'rgba(96,165,250,0.6)',  label:'Poya day (user-set)' },
          { color:'transparent',           border:'var(--border)',          label:'Regular day' },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:14, height:14, borderRadius:3, background:l.color, border:`1px solid ${l.border}` }}/>
            <span style={{ fontSize:13, color:'var(--text3)' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:14, height:14, borderRadius:3, background:'transparent', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--accent)' }}>✓</div>
          <span style={{ fontSize:13, color:'var(--text3)' }}>Click to toggle</span>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:60, color:'var(--text3)' }}>
            <Spinner /> Loading calendar…
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
            {MONTHS.map((mName, mIdx) => {
              const mNum    = mIdx + 1
              const mDays   = byMonth[mNum] || []
              const firstDay= mDays[0]?.weekday ?? 0
              const blanks  = Array(firstDay).fill(null)

              return (
                <div key={mName} style={{
                  background:'var(--bg3)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-lg)', padding:'12px',
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <p style={{ fontFamily:'var(--ff-head)', fontSize:14, fontWeight:700, color:'var(--text)' }}>{mName}</p>
                    <span style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--ff-mono)' }}>
                      {mDays.filter(d=>d.is_poya).length} Poya
                    </span>
                  </div>

                  {/* Day headers */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
                    {DAYS.map(d => (
                      <div key={d} style={{ textAlign:'center', fontSize:11, color:'var(--text3)', fontWeight:600 }}>{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                    {blanks.map((_, i) => <div key={`b${i}`}/>)}
                    {mDays.map(d => {
                      const isToggling = toggling === d.date
                      const isWeekend  = d.weekday >= 5

                      return (
                        <button
                          key={d.date}
                          title={`${d.date}${d.is_poya ? ' — Poya Day' : ''}\nClick to ${d.is_poya ? 'unmark' : 'mark as Poya'}`}
                          onClick={() => handleTick(d.date, d.is_poya)}
                          disabled={!!toggling}
                          style={{
                            width:'100%', aspectRatio:'1',
                            border:`1px solid ${
                              d.is_poya && d.user_set ? 'rgba(96,165,250,0.6)' :
                              d.is_poya              ? 'rgba(110,231,183,0.6)' :
                                                       'var(--border)'}`,
                            borderRadius:4,
                            background:
                              d.is_poya && d.user_set ? 'rgba(96,165,250,0.2)' :
                              d.is_poya              ? 'rgba(110,231,183,0.2)' :
                                                       'transparent',
                            cursor: toggling ? 'not-allowed' : 'pointer',
                            fontSize:isToggling ? 10 : 10,
                            fontFamily:'var(--ff-mono)',
                            color: d.is_poya ? (d.user_set ? 'var(--blue)' : 'var(--accent)') :
                                   isWeekend ? 'var(--text3)' : 'var(--text2)',
                            fontWeight: d.is_poya ? 600 : 400,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            transition:'all 0.15s',
                            opacity: isToggling ? 0.5 : 1,
                            position:'relative',
                          }}
                        >
                          {isToggling ? '…' : d.day}
                          {d.is_poya && !isToggling && (
                            <span style={{
                              position:'absolute', top:0, right:0,
                              fontSize:8, color: d.user_set ? 'var(--blue)' : 'var(--accent)',
                              lineHeight:1,
                            }}>●</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* PREDICTIONS VIEW */}
      {view === 'predictions' && (
        predLoading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:60, color:'var(--text3)' }}>
            <Spinner /> Predicting all Poya days…
          </div>
        ) : poyaPreds.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🌕</div>
            <p style={{ fontSize:16, fontWeight:600, color:'var(--text2)' }}>No Poya predictions yet</p>
            <p style={{ fontSize:14, marginTop:6 }}>Switch to Calendar view and click "Predict all Poya days"</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Summary bar */}
            <div style={{
              display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:8,
            }}>
              {[
                { label:'Poya days', value: poyaPreds.length },
                { label:'Avg demand', value: fmtINR(Math.round(poyaPreds.reduce((s,p)=>s+p.total_demand,0)/poyaPreds.length)) },
                { label:'Peak demand', value: fmtINR(Math.max(...poyaPreds.map(p=>p.total_demand))) },
                { label:'Total year', value: fmtINR(poyaPreds.reduce((s,p)=>s+p.total_demand,0)) },
              ].map(c => (
                <div key={c.label} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 14px' }}>
                  <p style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4 }}>{c.label}</p>
                  <p style={{ fontFamily:'var(--ff-mono)', fontSize:21, fontWeight:500, color:'var(--accent)' }}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Prediction rows */}
            {poyaPreds.map((p, i) => {
              const maxAtm = p.predictions.reduce((a,b)=>a.predicted>b.predicted?a:b, {predicted:0})
              return (
                <div key={p.date} style={{
                  padding:'14px 16px',
                  background:'var(--bg3)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-lg)',
                  display:'grid', gridTemplateColumns:'140px 1fr 80px 80px',
                  gap:16, alignItems:'center',
                }}>
                  <div>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:15, fontWeight:600, color:'var(--accent)' }}>{p.date}</p>
                    <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{p.day_name} · {p.month_name}</p>
                    {p.source === 'user-defined' && (
                      <span style={{ fontSize:11, padding:'1px 6px', borderRadius:10, background:'var(--blue-dim)', color:'var(--blue)', fontWeight:600 }}>USER SET</span>
                    )}
                  </div>
                  <div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {p.predictions.map(atm => (
                        <div key={atm.atm} style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ fontSize:12, color:'var(--text3)' }}>{atm.atm.replace(' ATM','')}</span>
                          <span style={{ fontFamily:'var(--ff-mono)', fontSize:13, color:'var(--text2)' }}>{fmtINR(atm.predicted)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:16, fontWeight:600, color:'var(--text)' }}>{fmtINR(p.total_demand)}</p>
                    <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>network</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--ff-mono)', fontSize:14, color:'var(--blue)' }}>{fmtINR(p.total_demand * 1.2)}</p>
                    <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>P90</p>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Predict all button in calendar view */}
      {view === 'calendar' && !loading && calendar.length > 0 && (
        <button
          onClick={() => { setView('predictions'); loadPredictions() }}
          style={{
            marginTop:16, width:'100%', padding:'11px',
            background:'linear-gradient(135deg, var(--accent), #059669)',
            color:'#021a10', border:'none', borderRadius:'var(--r)',
            fontFamily:'var(--ff-head)', fontWeight:700, fontSize:15,
            cursor:'pointer', letterSpacing:'-0.01em',
          }}
        >
          🌕 Predict cash demand for all {totalPoya} Poya days in {year}
        </button>
      )}
    </div>
  )
}

const arrowBtn = {
  width:28, height:28, border:'1px solid var(--border)',
  borderRadius:'var(--r)', background:'var(--bg3)',
  color:'var(--text2)', cursor:'pointer', fontSize:18,
  display:'flex', alignItems:'center', justifyContent:'center',
  fontFamily:'var(--ff-body)',
}

function Spinner() {
  return (
    <div style={{
      width:16, height:16, borderRadius:'50%',
      border:'2px solid var(--border2)',
      borderTopColor:'var(--accent)',
      animation:'spin 0.7s linear infinite',
    }}/>
  )
}

// src/pages/PoyaPage.jsx
// Sri Lanka Poya Day — calendar view + ATM demand prediction

import { useState, useEffect } from 'react'
import { fetchPoyaCalendar, fetchPoyaYears, fetchPoyaPredict } from '../utils/api'
import { fmtINR, fmtINRFull, ATM_ZONES, ZONE_COLORS } from '../utils/format'

const ATM_LIST = ['Airport ATM','Big Street ATM','Christ College ATM','KK Nagar ATM','Mount Road ATM']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function PoyaPage() {
  const [year,        setYear]        = useState(2017)
  const [years,       setYears]       = useState([])
  const [calendar,    setCalendar]    = useState([])
  const [summary,     setSummary]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [selDate,     setSelDate]     = useState(null)   // selected day for prediction
  const [atm,         setAtm]         = useState('all')
  const [predResult,  setPredResult]  = useState(null)
  const [predLoading, setPredLoading] = useState(false)
  const [predError,   setPredError]   = useState(null)

  // Load available years once
  useEffect(() => {
    fetchPoyaYears()
      .then(d => setYears(d.years))
      .catch(() => setYears([2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]))
  }, [])

  // Load calendar whenever year changes
  useEffect(() => {
    setLoading(true)
    setSelDate(null)
    setPredResult(null)
    fetchPoyaCalendar(year)
      .then(d => { setCalendar(d.calendar); setSummary(d.summary) })
      .catch(() => setCalendar([]))
      .finally(() => setLoading(false))
  }, [year])

  // Group calendar by month
  const byMonth = {}
  calendar.forEach(d => {
    if (!byMonth[d.month]) byMonth[d.month] = []
    byMonth[d.month].push(d)
  })

  // Run Poya prediction for selected date
  const runPoyaPredict = async () => {
    if (!selDate) return
    setPredLoading(true)
    setPredError(null)
    setPredResult(null)
    try {
      const r = await fetchPoyaPredict({ date: selDate, atmFilter: atm })
      setPredResult(r)
    } catch (e) {
      setPredError(e.response?.data?.error || e.message || 'API error')
    } finally {
      setPredLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header card ── */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21,
            }}>🌕</div>
            <h2 style={{ fontFamily: 'var(--ff-head)', fontWeight: 800, fontSize: 21, color: 'var(--text)', margin: 0 }}>
              Poya Day Prediction
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>
            Sri Lanka full-moon public holidays · Click any Poya day to predict ATM cash demand
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Year selector */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{
              padding: '8px 14px', background: 'var(--bg3)',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              color: 'var(--text)', fontFamily: 'var(--ff-body)',
              fontSize: 15, cursor: 'pointer', outline: 'none', appearance: 'none',
            }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {summary && (
            <div style={{
              padding: '8px 14px',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 'var(--r)',
              fontSize: 14, color: 'var(--amber)',
              fontFamily: 'var(--ff-mono)',
            }}>
              {summary.count} Poya days in {year}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* LEFT — Calendar grid */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)', padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
              {year} — Full calendar
            </p>
            <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }}/>
                Poya day
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--accent)', display: 'inline-block' }}/>
                Selected
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r)' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {Object.entries(byMonth).map(([month, days]) => (
                <MonthCard
                  key={month}
                  month={Number(month)}
                  days={days}
                  selDate={selDate}
                  onSelect={setSelDate}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Prediction panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Poya list */}
          {summary && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)', padding: '18px 20px',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                {year} Poya days
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.months.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => setSelDate(summary.dates[i])}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px',
                      background: selDate === summary.dates[i] ? 'rgba(251,191,36,0.12)' : 'var(--bg3)',
                      border: `1px solid ${selDate === summary.dates[i] ? 'rgba(251,191,36,0.35)' : 'var(--border)'}`,
                      borderRadius: 'var(--r)', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { if (selDate !== summary.dates[i]) e.currentTarget.style.borderColor = 'var(--border2)' }}
                    onMouseOut={e => { if (selDate !== summary.dates[i]) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🌕</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{m}</span>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 20,
                      background: 'rgba(251,191,36,0.12)',
                      color: 'var(--amber)',
                    }}>
                      {new Date(summary.dates[i] + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction form */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)', padding: '18px 20px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              Predict demand for Poya day
            </p>

            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected date</p>
            <div style={{
              padding: '9px 12px', marginBottom: 14,
              background: selDate ? 'rgba(251,191,36,0.08)' : 'var(--bg3)',
              border: `1px solid ${selDate ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
              borderRadius: 'var(--r)', fontSize: 15,
              color: selDate ? 'var(--amber)' : 'var(--text3)',
              fontFamily: selDate ? 'var(--ff-mono)' : 'var(--ff-body)',
            }}>
              {selDate || 'Click any day on the calendar ↑'}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ATM</p>
            <select
              value={atm}
              onChange={e => setAtm(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', marginBottom: 14,
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 'var(--r)', color: 'var(--text)',
                fontFamily: 'var(--ff-body)', fontSize: 15,
                cursor: 'pointer', outline: 'none', appearance: 'none',
              }}
            >
              <option value="all">All 5 ATMs</option>
              {ATM_LIST.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {predError && (
              <div style={{
                padding: '9px 12px', marginBottom: 12,
                background: 'rgba(251,113,133,0.1)',
                border: '1px solid rgba(251,113,133,0.25)',
                borderRadius: 'var(--r)', fontSize: 14, color: 'var(--rose)',
              }}>{predError}</div>
            )}

            <button
              onClick={runPoyaPredict}
              disabled={!selDate || predLoading}
              style={{
                width: '100%', padding: '11px',
                background: selDate && !predLoading
                  ? 'linear-gradient(135deg, #FBBF24, #D97706)'
                  : 'var(--bg4)',
                color: selDate && !predLoading ? '#1a0a00' : 'var(--text3)',
                border: 'none', borderRadius: 'var(--r)',
                fontFamily: 'var(--ff-head)', fontWeight: 700, fontSize: 15,
                cursor: selDate && !predLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {predLoading ? (
                <>
                  <div style={{
                    width: 13, height: 13, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'var(--text3)',
                    animation: 'spin 0.7s linear infinite',
                  }}/>
                  Predicting…
                </>
              ) : '🌕 Predict Poya Demand'}
            </button>
          </div>

          {/* Results */}
          {predResult && <PoyaResult result={predResult} />}
        </div>
      </div>
    </div>
  )
}

// ── Month card with day grid ───────────────────────────────
function MonthCard({ month, days, selDate, onSelect }) {
  const firstDay = new Date(`${days[0].date}T12:00:00`).getDay()
  const blanks   = Array.from({ length: firstDay })

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '10px 12px',
    }}>
      <p style={{
        fontSize: 13, fontWeight: 700, color: 'var(--text2)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8,
      }}>{MONTH_NAMES[month - 1]}</p>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ fontSize: 11, textAlign: 'center', color: 'var(--text3)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(d => {
          const isSel   = selDate === d.date
          const isPoya  = d.is_poya
          return (
            <div
              key={d.date}
              title={isPoya ? `🌕 Poya Day — ${d.date}` : d.date}
              onClick={() => onSelect(d.date)}
              style={{
                height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: isPoya ? 700 : 400,
                borderRadius: 4, cursor: 'pointer',
                position: 'relative',
                background: isSel
                  ? 'var(--accent)'
                  : isPoya
                  ? 'rgba(251,191,36,0.18)'
                  : 'transparent',
                color: isSel
                  ? '#021a10'
                  : isPoya
                  ? 'var(--amber)'
                  : 'var(--text2)',
                border: isSel
                  ? '1px solid var(--accent)'
                  : isPoya
                  ? '1px solid rgba(251,191,36,0.4)'
                  : '1px solid transparent',
                transition: 'all 0.1s',
              }}
            >
              {d.day}
              {isPoya && !isSel && (
                <div style={{
                  position: 'absolute', bottom: 1, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3, height: 3, borderRadius: '50%',
                  background: 'var(--amber)',
                }}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Poya prediction result ─────────────────────────────────
function PoyaResult({ result }) {
  const { predictions, date, is_poya_date, poya_note } = result
  const total       = predictions.reduce((s, p) => s + p.predicted, 0)
  const totalNormal = predictions.reduce((s, p) => s + p.normal_predicted, 0)
  const netUplift   = total - totalNormal

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid rgba(251,191,36,0.3)',
      borderRadius: 'var(--r-xl)', padding: '18px 20px',
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 20, marginBottom: 14,
        background: is_poya_date ? 'rgba(251,191,36,0.15)' : 'rgba(110,231,183,0.12)',
        border: `1px solid ${is_poya_date ? 'rgba(251,191,36,0.35)' : 'rgba(110,231,183,0.25)'}`,
        fontSize: 13, fontWeight: 600,
        color: is_poya_date ? 'var(--amber)' : 'var(--accent)',
      }}>
        <span>{is_poya_date ? '🌕' : '🔮'}</span>
        {poya_note}
      </div>

      {/* Network totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{
          padding: '10px 12px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 4px' }}>Poya demand</p>
          <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 21, fontWeight: 500, color: 'var(--amber)', margin: 0 }}>
            {fmtINR(total)}
          </p>
        </div>
        <div style={{
          padding: '10px 12px', background: 'var(--bg3)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 4px' }}>vs Normal day</p>
          <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 21, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            {fmtINR(totalNormal)}
          </p>
        </div>
      </div>

      {/* Uplift banner */}
      <div style={{
        padding: '9px 12px', marginBottom: 14,
        background: netUplift > 0 ? 'rgba(110,231,183,0.08)' : 'rgba(251,113,133,0.08)',
        border: `1px solid ${netUplift > 0 ? 'rgba(110,231,183,0.2)' : 'rgba(251,113,133,0.2)'}`,
        borderRadius: 'var(--r)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 14, color: 'var(--text2)' }}>Poya uplift (total network)</span>
        <span style={{
          fontFamily: 'var(--ff-mono)', fontSize: 15, fontWeight: 600,
          color: netUplift > 0 ? 'var(--accent)' : 'var(--rose)',
        }}>
          {netUplift > 0 ? '+' : ''}{fmtINR(netUplift)}
        </span>
      </div>

      {/* Per-ATM rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {predictions.map(p => {
          const zone = ATM_ZONES[p.atm] || 'unknown'
          const zc   = ZONE_COLORS[zone] || { bg: 'var(--bg4)', text: 'var(--text2)' }
          return (
            <div key={p.atm} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto',
              gap: 10, alignItems: 'center',
              padding: '8px 10px',
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {p.atm.replace(' ATM', '')}
                </p>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px',
                  borderRadius: 20, textTransform: 'uppercase',
                  background: zc.bg, color: zc.text,
                }}>{zone}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 15, color: 'var(--amber)', margin: 0 }}>
                  {fmtINR(p.predicted)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>Poya</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontFamily: 'var(--ff-mono)', fontSize: 13,
                  color: p.poya_uplift > 0 ? 'var(--accent)' : 'var(--rose)',
                  margin: 0, fontWeight: 600,
                }}>
                  {p.poya_uplift > 0 ? '+' : ''}{p.uplift_pct}%
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>uplift</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

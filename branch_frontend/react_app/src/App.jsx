// src/App.jsx
import { useState } from 'react'
import { useAuth }                  from './context/AuthContext'
import LoginPage                    from './pages/LoginPage'
import Navbar                       from './components/Navbar'
import PredictionForm               from './components/PredictionForm'
import { downloadWeeklyReport }     from './utils/api'
import SummaryCards                 from './components/SummaryCards'
import ATMResultList                from './components/ATMResultList'
import HistoryChart                 from './components/HistoryChart'
import ModelStats                   from './components/ModelStats'
import MissingDates                 from './components/MissingDates'
import ConfidenceBands              from './components/ConfidenceBands'
import PoyaDashboard                from './components/PoyaDashboard'
import SpecialDaysDashboard         from './components/SpecialDaysDashboard'
import SinhalaNewYearDashboard      from './components/SinhalaNewYearDashboard'
import WeekForecast                 from './components/WeekForecast'
import CashAlerts                   from './components/CashAlerts'

const TABS = [
  { id:'Predictions',      label:'Predictions',     icon:'📊' },
  { id:'Week Forecast',    label:'7-Day Forecast',  icon:'📅' },
  { id:'Cash Alerts',      label:'Cash Alerts',     icon:'🚨' },
  { id:'Poya Days',        label:'Poya Days',       icon:'🌕' },
  { id:'Special Days',     label:'Special Days',    icon:'🎄' },
  { id:'Sinhala New Year', label:'Sinhala NY',      icon:'🌸' },
  { id:'History',          label:'History',         icon:'📈' },
  { id:'Model Stats',      label:'Model Stats',     icon:'🤖' },
  { id:'Missing Dates',    label:'Missing Dates',   icon:'📅' },
]

const TAB_STYLES = {
  'Week Forecast':    { active:'rgba(96,165,250,0.15)',  color:'#60A5FA' },
  'Cash Alerts':      { active:'rgba(239,68,68,0.15)',   color:'#EF4444' },
  'Poya Days':        { active:'rgba(251,191,36,0.15)',  color:'#FBBF24' },
  'Special Days':     { active:'rgba(239,68,68,0.15)',   color:'#EF4444' },
  'Sinhala New Year': { active:'rgba(245,158,11,0.15)',  color:'#F59E0B' },
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  if (!user)   return <LoginPage />
  return <Dashboard />
}

function Dashboard() {
  const [result, setResult] = useState(null)
  const [busy,   setBusy]   = useState(false)
  const [tab,    setTab]    = useState('Predictions')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMessage, setReportMessage] = useState('')

  const toWeekStart = (value) => {
    if (!value) return new Date().toISOString().slice(0, 10)
    const d = new Date(`${value}T12:00:00`)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().slice(0, 10)
  }

  const handleDownloadReport = async () => {
    if (!result?.predictions?.length) return
    setReportBusy(true)
    setReportMessage('')
    try {
      await downloadWeeklyReport({ weekStart: toWeekStart(result.date) })
      setReportMessage('Weekly report downloaded successfully.')
    } catch (e) {
      setReportMessage(e.userMessage || e.message || 'Report download failed.')
    } finally {
      setReportBusy(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />

      <div style={{ padding:'32px 40px 0', maxWidth:1800, margin:'0 auto', width:'100%' }}>
        <p style={{
          fontFamily:'var(--ff-serif)', fontStyle:'normal', fontSize:42,
          fontWeight:400, color:'var(--text)',
          letterSpacing:'-0.02em', lineHeight:1.1, marginBottom:6,
        }}>
          Cash demand <span style={{ color:'var(--accent)' }}>dashboard</span>
        </p>
        <p style={{ fontSize:16, color:'var(--text3)', marginBottom:28 }}>
          Predict · Forecast · Alert · Poya · Christmas · Sinhala New Year — 5 ATM branches
        </p>
      </div>

      <div style={{
        maxWidth:1800, margin:'0 auto',
        padding:'0 40px 48px',
        display:'grid', gridTemplateColumns:'400px 1fr',
        gap:28, alignItems:'start',
        width:'100%',
      }}>
        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <PredictionForm onResult={setResult} onLoading={setBusy} />
          {busy && <Spinner />}
          {result?.predictions && <ConfidenceBands predictions={result.predictions} />}
        </div>

        {/* RIGHT */}
        <div>
          {/* Tab bar */}
          <div style={{
            display:'flex', gap:3, marginBottom:20,
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:5,
            flexWrap:'nowrap', overflowX:'auto',
          }}>
            {TABS.map(t => {
              const tc = TAB_STYLES[t.id]
              const isActive = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex:'0 0 auto', padding:'10px 14px',
                  border:'none', cursor:'pointer',
                  borderRadius:'var(--r)', whiteSpace:'nowrap',
                  fontFamily:'var(--ff-body)', fontSize:13, fontWeight:600,
                  transition:'all .15s',
                  background: isActive ? (tc?.active || 'var(--bg4)') : 'transparent',
                  color:      isActive ? (tc?.color  || 'var(--text)') : 'var(--text3)',
                }}>
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {tab === 'Predictions' && (
            <div>
              {!result && !busy && <EmptyState />}

              {result && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <SummaryCards result={result} />
                  <ATMResultList predictions={result.predictions} />
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap', marginTop: result ? 0 : 14 }}>
                <span style={{ fontSize:15, color:'var(--text3)' }}>
                  {result?.date ? `Prediction for ${result.date}` : 'No prediction yet'}
                </span>
                <button
                  onClick={handleDownloadReport}
                  disabled={reportBusy || !result?.predictions?.length}
                  style={{
                    padding:'10px 16px',
                    border:'1px solid var(--accent)',
                    borderRadius:'var(--r)',
                    background:'var(--bg2)',
                    color:'var(--accent)',
                    cursor: reportBusy || !result?.predictions?.length ? 'not-allowed' : 'pointer',
                    fontWeight:600,
                    fontSize:15,
                    opacity: (reportBusy || !result?.predictions?.length) ? 0.6 : 1,
                  }}
                >
                  {reportBusy ? '⏳ Generating…' : '📥 Weekly Report'}
                </button>
              </div>

              {reportMessage && (
                <div style={{ fontSize:15, color: reportMessage.includes('failed') ? 'var(--rose)' : 'var(--accent)' }}>
                  {reportMessage}
                </div>
              )}
            </div>
          )}
          {tab === 'Week Forecast'    && <WeekForecast />}
          {tab === 'Cash Alerts'      && <CashAlerts />}
          {tab === 'Poya Days'        && <PoyaDashboard />}
          {tab === 'Special Days'     && <SpecialDaysDashboard />}
          {tab === 'Sinhala New Year' && <SinhalaNewYearDashboard />}
          {tab === 'History'          && <HistoryChart />}
          {tab === 'Model Stats'      && <ModelStats />}
          {tab === 'Missing Dates'    && <MissingDates />}
        </div>
      </div>
    </div>
  )
}

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    gap:10, padding:20, color:'var(--text3)', fontSize:15 }}>
    <div style={{ width:16, height:16, borderRadius:'50%',
      border:'2px solid var(--border2)', borderTopColor:'var(--accent)',
      animation:'spin .7s linear infinite' }}/>
    Running XGBoost model…
  </div>
)

const EmptyState = () => (
  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:'var(--r-xl)', padding:'90px 20px', textAlign:'center' }}>
    <div style={{ fontSize:52, marginBottom:16 }}>📊</div>
    <p style={{ fontFamily:'var(--ff-head)', fontSize:20, fontWeight:700, color:'var(--text2)' }}>
      No prediction yet
    </p>
    <p style={{ fontSize:15, color:'var(--text3)', marginTop:8 }}>
      Configure parameters on the left and click Predict
    </p>
  </div>
)

const Loader = () => (
  <div style={{ minHeight:'100vh', background:'var(--bg)',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', gap:16 }}>
    <div style={{ width:44, height:44, borderRadius:12,
      background:'linear-gradient(135deg,var(--accent),#059669)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:27 }}>🏧</div>
    <div style={{ width:20, height:20, borderRadius:'50%',
      border:'2px solid var(--border2)', borderTopColor:'var(--accent)',
      animation:'spin .7s linear infinite' }}/>
    <p style={{ fontSize:14, color:'var(--text3)' }}>Loading session…</p>
  </div>
)

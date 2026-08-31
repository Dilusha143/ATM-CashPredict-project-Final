// src/components/PredictionForm.jsx
import { useState } from 'react'
import { fetchPrediction } from '../utils/api'

const ATMS = ['Airport ATM','Big Street ATM','Christ College ATM','KK Nagar ATM','Mount Road ATM']

export default function PredictionForm({ onResult, onLoading }) {
  const [date,    setDate]    = useState('2017-09-30')
  const [atm,     setAtm]     = useState('all')
  const [holiday, setHoliday] = useState('auto')
  const [salary,  setSalary]  = useState(false)
  const [error,   setError]   = useState(null)

  const run = async () => {
    if (!date) { setError('Please select a date'); return }
    setError(null); onLoading(true)
    try {
      const r = await fetchPrediction({ date, atmFilter: atm, isHoliday: holiday })
      onResult(r)
    } catch(e) {
      setError(e.response?.data?.error || 'API error — is Flask running?')
      onResult(null)
    } finally { onLoading(false) }
  }

  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:'var(--ff-head)', fontWeight:700, fontSize:19, color:'var(--text)', letterSpacing:'-0.01em', margin:0 }}>Prediction Parameters</h2>
          <p style={{ fontSize:14, color:'var(--text3)', marginTop:3 }}>Configure and run the XGBoost model</p>
        </div>
        <span style={{ fontSize:13, fontWeight:600, letterSpacing:'0.08em', padding:'5px 11px', borderRadius:20, background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid rgba(110,231,183,0.2)' }}>ML MODEL</span>
      </div>

      <Lbl>Target date</Lbl>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>

      <Lbl mt>ATM selection</Lbl>
      <select value={atm} onChange={e=>setAtm(e.target.value)} style={inp}>
        <option value="all">All 5 ATMs</option>
        {ATMS.map(a=><option key={a} value={a}>{a}</option>)}
      </select>

      <Lbl mt>Holiday override</Lbl>
      <select value={holiday} onChange={e=>setHoliday(e.target.value)} style={inp}>
        <option value="auto">Auto-detect</option>
        <option value="1">Yes — public holiday</option>
        <option value="0">No — working day</option>
      </select>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18 }}>
        <span style={{ fontSize:15, color:'var(--text2)' }}>Mark as salary day</span>
        <Toggle checked={salary} onChange={setSalary}/>
      </div>

      {error && <div style={{ marginTop:16, padding:'10px 13px', background:'var(--rose-dim)', border:'1px solid rgba(251,113,133,0.25)', borderRadius:'var(--r)', fontSize:14, color:'var(--rose)' }}>{error}</div>}

      <button onClick={run} style={{ marginTop:22, width:'100%', padding:14, background:'linear-gradient(135deg,var(--accent),#059669)', color:'#021a10', border:'none', borderRadius:'var(--r)', fontFamily:'var(--ff-head)', fontWeight:700, fontSize:17, cursor:'pointer' }}>
        🔮 Predict Cash Demand
      </button>
    </div>
  )
}

const Lbl = ({ children, mt }) => <p style={{ fontSize:14, fontWeight:600, color:'var(--text3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:7, marginTop: mt?16:0 }}>{children}</p>
const inp = { width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text)', fontFamily:'var(--ff-body)', fontSize:16, outline:'none', appearance:'none' }

function Toggle({ checked, onChange }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{ width:40, height:22, borderRadius:11, background: checked?'var(--accent)':'var(--bg4)', border:'1px solid var(--border)', position:'relative', cursor:'pointer', transition:'background .2s' }}>
      <div style={{ position:'absolute', top:2, left: checked?20:2, width:16, height:16, borderRadius:'50%', background: checked?'#021a10':'var(--text3)', transition:'left .2s, background .2s' }}/>
    </div>
  )
}

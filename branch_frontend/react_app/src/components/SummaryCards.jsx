// src/components/SummaryCards.jsx
import { fmtINR, fmtINRFull, DAY_NAMES } from '../utils/format'

export default function SummaryCards({ result }) {
  if (!result) return null
  const { predictions, date, is_holiday, is_salary_day } = result
  const total = predictions.reduce((s, p) => s + p.predicted, 0)
  const peak  = predictions.reduce((a, b) => a.predicted > b.predicted ? a : b)
  const d     = new Date(date + 'T12:00:00')
  const isWknd = d.getDay() === 0 || d.getDay() === 6
  const dayLabel = is_holiday ? '🔴 Holiday' : is_salary_day ? '💰 Salary Day' : isWknd ? '📅 Weekend' : '🟢 Working Day'

  const cards = [
    { label:'Total network load', value:fmtINR(total),                  sub:fmtINRFull(total), color:'var(--accent)' },
    { label:'Peak ATM',           value:peak.atm.replace(' ATM',''),     sub:fmtINR(peak.predicted), color:'var(--blue)' },
    { label:'Day of week',        value:DAY_NAMES[d.getDay()].slice(0,3),sub:dayLabel, color:'var(--violet)' },
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
      {cards.map((c,i) => (
        <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:16, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:c.color, opacity:.8 }}/>
          <p style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:8 }}>{c.label}</p>
          <p style={{ fontFamily:'var(--ff-head)', fontWeight:800, fontSize:25, color:c.color, letterSpacing:'-0.02em', lineHeight:1 }}>{c.value}</p>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:5 }}>{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

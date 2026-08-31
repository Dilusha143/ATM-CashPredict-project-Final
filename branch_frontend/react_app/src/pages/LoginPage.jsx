// src/pages/LoginPage.jsx
import { useState } from 'react'
import { loginUser } from '../utils/api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [show, setShow]     = useState(false)
  const [err,  setErr]      = useState(null)
  const [load, setLoad]     = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!user || !pass) { setErr('Enter username and password'); return }
    setErr(null); setLoad(true)
    try {
      const d = await loginUser(user.trim(), pass)
      login(d.user)
    } catch(e) {
      setErr(e.response?.data?.error || 'Login failed. Check credentials.')
    } finally { setLoad(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', top:-100, left:-100, background:'radial-gradient(circle,rgba(110,231,183,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', bottom:-80, right:-80, background:'radial-gradient(circle,rgba(96,165,250,0.06) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:62, height:62, borderRadius:16, margin:'0 auto 18px', background:'linear-gradient(135deg,var(--accent),#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:35, boxShadow:'0 8px 28px rgba(110,231,183,0.2)' }}>🏧</div>
          <h1 style={{ fontFamily:'var(--ff-head)', fontWeight:800, fontSize:33, color:'var(--text)', letterSpacing:'-0.03em', margin:'0 0 7px' }}>
            ATM <span style={{ color:'var(--accent)' }}>CashPredict</span>
          </h1>
          <p style={{ fontSize:16, color:'var(--text3)' }}>Sign in to access the forecasting dashboard</p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:32, boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }}>
          <form onSubmit={submit}>
            {/* Username */}
            <p style={lbl}>Username</p>
            <div style={{ position:'relative', marginBottom:16 }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:19, opacity:.35 }}>👤</span>
              <input type="text" value={user} onChange={e=>setUser(e.target.value)}
                placeholder="Enter username" autoComplete="username"
                style={{ ...inp, paddingLeft:40 }}/>
            </div>

            {/* Password */}
            <p style={lbl}>Password</p>
            <div style={{ position:'relative', marginBottom:22 }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:19, opacity:.35 }}>🔒</span>
              <input type={show?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="Enter password" autoComplete="current-password"
                style={{ ...inp, paddingLeft:40, paddingRight:42 }}/>
              <button type="button" onClick={()=>setShow(!show)}
                style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:17, opacity:.5, color:'var(--text)', padding:4 }}>
                {show?'🙈':'👁'}
              </button>
            </div>

            {err && <div style={{ padding:'10px 13px', marginBottom:16, background:'rgba(251,113,133,0.1)', border:'1px solid rgba(251,113,133,0.25)', borderRadius:'var(--r)', fontSize:15, color:'var(--rose)' }}>⚠️ {err}</div>}

            <button type="submit" disabled={load} style={{
              width:'100%', padding:14,
              background: load?'var(--bg4)':'linear-gradient(135deg,var(--accent),#059669)',
              color: load?'var(--text3)':'#021a10',
              border:'none', borderRadius:'var(--r)',
              fontFamily:'var(--ff-head)', fontWeight:700, fontSize:18,
              cursor: load?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {load ? (<><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)', borderTopColor:'var(--text)', animation:'spin .7s linear infinite' }}/> Signing in…</>) : '🔐 Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontSize:14, color:'var(--text3)', marginTop:20 }}>
          ATM CashPredict v2 · Poya Edition · XGBoost Demand Forecasting
        </p>
      </div>
    </div>
  )
}

const lbl = { fontSize:14, fontWeight:600, color:'var(--text3)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:7 }
const inp = { width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', color:'var(--text)', fontFamily:'var(--ff-body)', fontSize:16, outline:'none', boxSizing:'border-box' }

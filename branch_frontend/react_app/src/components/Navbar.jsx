// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { fetchHealth } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const ROLE_COLORS = { admin:'#6EE7B7', analyst:'#60A5FA', viewer:'#A78BFA' }
const ROLE_ICONS  = { admin:'👑', analyst:'📊', viewer:'👁' }

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [health, setHealth]   = useState(null)
  const [menu,   setMenu]     = useState(false)

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ status:'offline' }))
  }, [])

  const online = health?.status === 'ok'
  const rc     = ROLE_COLORS[user?.role] || '#6EE7B7'

  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', height:72, background:'var(--nav-bg)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)' }}>

      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,var(--accent),#059669)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:25 }}>🏧</div>
        <div>
          <div style={{ fontFamily:'var(--ff-head)', fontWeight:800, fontSize:21, letterSpacing:'-0.02em', color:'var(--text)' }}>
            ATM <span style={{ color:'var(--accent)' }}>CashPredict</span>
            <span style={{ fontSize:15, color:'var(--amber)', marginLeft:8, fontWeight:500 }}>🌕 Poya Edition</span>
          </div>
          <div style={{ fontSize:15, color:'var(--text3)', letterSpacing:'0.08em' }}>DEMAND FORECASTING SYSTEM</div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Pill>XGBoost v2</Pill>
        <Pill>5 ATMs</Pill>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:38, height:38, padding:0,
            background:'var(--bg3)', border:'1px solid var(--border)',
            borderRadius:'50%', cursor:'pointer', fontSize:17,
            transition:'border-color .15s, background .15s',
          }}
          onMouseOver={e=>e.currentTarget.style.background='var(--bg4)'}
          onMouseOut={e=>e.currentTarget.style.background='var(--bg3)'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* API status */}
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 14px', background: online?'rgba(110,231,183,0.08)':'rgba(251,113,133,0.08)', border:`1px solid ${online?'rgba(110,231,183,0.2)':'rgba(251,113,133,0.2)'}`, borderRadius:20, fontSize:16, color: online?'var(--accent)':'var(--rose)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background: online?'var(--accent)':'var(--rose)', animation: online?'pulse-dot 2s infinite':'none' }}/>
          {online ? `${health.models_loaded} models live` : 'API offline'}
        </div>

        {/* User menu */}
        {user && (
          <div style={{ position:'relative' }}>
            <button onClick={() => setMenu(!menu)} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 14px 6px 6px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, cursor:'pointer', transition:'border-color .15s' }}
              onMouseOver={e=>e.currentTarget.style.borderColor=rc}
              onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:`${rc}22`, border:`1px solid ${rc}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>{ROLE_ICONS[user.role]}</div>
              <span style={{ fontSize:17, fontWeight:600, color:'var(--text)' }}>{user.name}</span>
              <span style={{ fontSize:14, fontWeight:700, padding:'2px 7px', borderRadius:10, textTransform:'uppercase', letterSpacing:'0.05em', background:`${rc}22`, color:rc }}>{user.role}</span>
              <span style={{ fontSize:15, color:'var(--text3)' }}>▾</span>
            </button>

            {menu && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'var(--r-lg)', padding:8, minWidth:180, boxShadow:'0 16px 40px rgba(0,0,0,0.5)', zIndex:200 }}>
                <div style={{ padding:'8px 12px', marginBottom:4 }}>
                  <p style={{ fontSize:17, fontWeight:600, color:'var(--text)', margin:0 }}>{user.name}</p>
                  <p style={{ fontSize:15, color:'var(--text3)', margin:0 }}>@{user.username}</p>
                </div>
                <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
                <button onClick={() => { setMenu(false); logout() }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'none', border:'none', borderRadius:'var(--r)', cursor:'pointer', fontSize:16, color:'var(--rose)', transition:'background .1s' }}
                  onMouseOver={e=>e.currentTarget.style.background='rgba(251,113,133,0.08)'}
                  onMouseOut={e=>e.currentTarget.style.background='none'}>
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

const Pill = ({ children }) => (
  <div style={{ padding:'6px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, fontSize:16, color:'var(--text2)' }}>{children}</div>
)

// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { fetchMe, logoutUser, clearToken } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then(d => setUser(d.user))
      .catch(() => { clearToken(); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login  = (u) => setUser(u)
  const logout = async () => {
    try { await logoutUser() } catch { clearToken() }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

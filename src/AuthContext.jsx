import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet } from './api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [authError, setAuthError] = useState('')

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiGet('auth/me')
      setUser(result.user)
      setAuthError('')
      return result.user
    } catch (error) {
      if (error.status === 401) {
        setUser(null)
        setAuthError('')
        return null
      }
      setAuthError(error.message)
      return null
    } finally {
      setStatus('ready')
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const register = useCallback(async (details) => {
    const result = await apiGet('auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
    return result.user
  }, [])

  const login = useCallback(async (identifier, password, rememberMe) => {
    setAuthError('')
    const result = await apiGet('auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, rememberMe }),
    })
    setUser(result.user)
    setStatus('ready')
    return result.user
  }, [])

  const logout = useCallback(async () => {
    await apiGet('auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    status,
    authError,
    register,
    login,
    logout,
    refreshUser,
  }), [user, status, authError, register, login, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

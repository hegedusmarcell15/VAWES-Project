import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setError('')
    setBusy(true)
    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-violet" aria-hidden="true" />
      <div className="auth-glow auth-glow-cyan" aria-hidden="true" />
      <header className="auth-header">
        <Link className="auth-brand" to="/">VAWES</Link>
        <button className="auth-home admin-logout" type="button" onClick={handleLogout} disabled={busy}>
          {busy ? t('adminSigningOut') : t('adminSignOut')}
        </button>
      </header>
      <section className="auth-card glass admin-dashboard" aria-labelledby="admin-dashboard-title">
        <div className="auth-mark"><Icon name="shield" size={22} /></div>
        <p className="auth-eyebrow">VAWES / ADMIN</p>
        <h1 id="admin-dashboard-title">{t('adminDashboardTitle')}</h1>
        <p className="auth-description">{t('adminDashboardWelcome')}</p>
        <div className="admin-account">
          <span className="admin-account-label">{t('adminSignedInAs')}</span>
          <strong>{user?.email}</strong>
        </div>
        {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
      </section>
    </main>
  )
}

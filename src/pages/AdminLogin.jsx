import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { isAllowedAdmin } from '../adminAccess.js'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'
import '../auth.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const user = await login(email.trim(), password, false)
      if (!isAllowedAdmin(user)) {
        await logout()
        setError(t('adminAccessDenied'))
        return
      }
      navigate('/admin', { replace: true })
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
        <Link className="auth-brand" to="/" aria-label={`VAWES ${t('home')}`}>VAWES</Link>
        <Link className="auth-home" to="/login">{t('adminBackToLogin')}</Link>
      </header>
      <section className="auth-card glass" aria-labelledby="admin-login-title">
        <div className="auth-mark"><Icon name="shield" size={22} /></div>
        <p className="auth-eyebrow">VAWES / ADMIN</p>
        <h1 id="admin-login-title">{t('adminLoginTitle')}</h1>
        <p className="auth-description">{t('adminLoginDescription')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('adminEmail')}</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>{t('authPassword')}</span>
            <span className="auth-password-wrap">
              <input
                type={visible ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                aria-label={visible ? t('authHidePassword') : t('authShowPassword')}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? t('authHidePassword') : t('authShowPassword')}
              </button>
            </span>
          </label>

          {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? t('adminSigningIn') : t('adminLoginButton')}
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login">{t('adminBackToLogin')}</Link>
        </p>
      </section>
    </main>
  )
}

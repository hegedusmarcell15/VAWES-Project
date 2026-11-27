import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api/client.js'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'
import '../auth.css'

export default function ResetPassword() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const redirectTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
      }
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError(t('authPasswordMismatch'))
      return
    }

    setBusy(true)

    try {
      await apiGet('auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })

      setSuccess(t('resetSuccess'))
      setPassword('')
      setConfirmPassword('')

      redirectTimer.current = setTimeout(
        () => navigate('/login', { replace: true }),
        2500
      )
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
        <Link className="auth-home" to="/">{t('home')}</Link>
      </header>

      <section className="auth-card glass" aria-labelledby="reset-title">
        <div className="auth-mark">
          <Icon name="lock" size={22} />
        </div>

        <p className="auth-eyebrow">VAWES / ACCOUNT</p>
        <h1 id="reset-title">{t('resetTitle')}</h1>
        <p className="auth-description">{t('resetDescription')}</p>

        {!token ? (
          <>
            <p className="auth-feedback is-error" role="alert">{t('resetMissingToken')}</p>
            <p className="auth-switch">
              <Link to="/forgot-password">{t('resetRequestNew')}</Link>
            </p>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>{t('resetNewPassword')}</span>
              <span className="auth-password-wrap">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy || !!success}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setVisible((value) => !value)}
                  disabled={busy || !!success}
                >
                  {visible ? t('authHidePassword') : t('authShowPassword')}
                </button>
              </span>
            </label>

            <label className="auth-field">
              <span>{t('resetConfirmPassword')}</span>
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={busy || !!success}
                required
              />
            </label>

            <small className="auth-strength">{t('resetStrength')}</small>

            {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
            {success && <p className="auth-feedback is-success" role="status">{success}</p>}

            <button className="auth-submit" type="submit" disabled={busy || !!success}>
              {busy ? t('resetSending') : t('resetSubmit')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">{t('resetBackToSignIn')}</Link>
        </p>
      </section>
    </main>
  )
}

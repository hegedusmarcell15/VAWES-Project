import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api/client.js'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'
import '../auth.css'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)

    try {
      await apiGet('auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSuccess(t('forgotSuccess'))
      setEmail('')
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

      <section className="auth-card glass" aria-labelledby="forgot-title">
        <div className="auth-mark">
          <Icon name="lock" size={22} />
        </div>

        <p className="auth-eyebrow">VAWES / ACCOUNT</p>
        <h1 id="forgot-title">{t('forgotTitle')}</h1>
        <p className="auth-description">{t('forgotDescription')}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>{t('forgotEmail')}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
          {success && <p className="auth-feedback is-success" role="status">{success}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? t('forgotSending') : t('forgotSend')}
          </button>
        </form>

        <p className="auth-switch">
          {t('forgotBackToSignIn')} <Link to="/login">{t('authLogin')}</Link>
        </p>
      </section>
    </main>
  )
}

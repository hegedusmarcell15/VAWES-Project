import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'
import '../auth.css'

function passwordScore(password) {
  return [
    password.length >= 10,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length
}

export default function AuthPage() {
  const isRegister = useLocation().pathname === '/register'
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { login, register, authError } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const score = useMemo(() => passwordScore(password), [password])
  const strengthLabels = [t('authStrengthWeak'), t('authStrengthFair'), t('authStrengthGood'), t('authStrengthStrong')]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (isRegister && password !== confirmPassword) {
      setError(t('authPasswordMismatch'))
      return
    }

    setBusy(true)
    try {
      if (isRegister) {
        await register({ username, email, password })
        setPassword('')
        setConfirmPassword('')
        setSuccess(t('authRegisterSuccess'))
      } else {
        await login(identifier, password, rememberMe)
        navigate('/', { replace: true })
      }
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
        <Link className="auth-home" to="/">{t('home')}</Link>
      </header>
      <section className="auth-card glass" aria-labelledby="auth-title">
        <div className="auth-mark"><Icon name="user" size={22} /></div>
        <p className="auth-eyebrow">VAWES / ACCOUNT</p>
        <h1 id="auth-title">{isRegister ? t('authRegisterTitle') : t('authLoginTitle')}</h1>
        <p className="auth-description">{t('authWelcome')}</p>

        <div className="auth-tabs" role="tablist" aria-label={t('account')}>
          <Link to="/login" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''}>{t('authLogin')}</Link>
          <Link to="/register" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''}>{t('authRegister')}</Link>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <label className="auth-field">
                <span>{t('authUsername')}</span>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={50}
                  pattern="[\p{L}\p{N}._-]{3,50}"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>
              <label className="auth-field">
                <span>{t('authEmail')}</span>
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
            </>
          ) : (
            <label className="auth-field">
              <span>{t('authEmailOrUsername')}</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                maxLength={255}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>{t('authPassword')}</span>
            <span className="auth-password-wrap">
              <input
                type={visible ? 'text' : 'password'}
                name="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 10 : 1}
                maxLength={128}
                pattern={isRegister ? '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}' : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button type="button" className="auth-toggle-password" onClick={() => setVisible((value) => !value)}>
                {visible ? t('authHidePassword') : t('authShowPassword')}
              </button>
            </span>
          </label>

          {isRegister && (
            <>
              <div className="auth-strength" aria-live="polite">
                <div className="auth-strength-heading">
                  <span>{t('authStrength')}</span>
                  <span>{password ? strengthLabels[Math.max(0, score - 1)] : ''}</span>
                </div>
                <div className="auth-strength-meter" role="progressbar" aria-label={t('authStrength')} aria-valuemin={0} aria-valuemax={4} aria-valuenow={score}>
                  {[0, 1, 2, 3].map((step) => <span key={step} className={step < score ? `level-${score}` : ''} />)}
                </div>
                <small>{t('authPasswordRule')}</small>
              </div>
              <label className="auth-field">
                <span>{t('authConfirmPassword')}</span>
                <span className="auth-password-wrap">
                  <input
                    type={visible ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={128}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,128}"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button type="button" className="auth-toggle-password" onClick={() => setVisible((value) => !value)}>
                    {visible ? t('authHidePassword') : t('authShowPassword')}
                  </button>
                </span>
              </label>
            </>
          )}

          {!isRegister && (
            <label className="auth-remember">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>{t('authRememberMe')}</span>
            </label>
          )}

          {(error || authError) && <p className="auth-feedback is-error" role="alert">{error || authError}</p>}
          {success && <p className="auth-feedback is-success" role="status">{success}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? '…' : isRegister ? t('authRegister') : t('authLogin')}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? t('authHaveAccount') : t('authNeedAccount')}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? t('authLogin') : t('authRegister')}</Link>
        </p>
      </section>
    </main>
  )
}

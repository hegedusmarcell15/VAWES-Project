
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api/client.js'
import Icon from '../components/Icon.jsx'
import '../auth.css'

export default function ResetPassword() {
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
      setError('The passwords do not match.')
      return
    }

    setBusy(true)

    try {
      const result = await apiGet('auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      })

      setSuccess(result.message || 'Your password has been reset successfully.')
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
        <Link className="auth-home" to="/">Home</Link>
      </header>

      <section className="auth-card glass" aria-labelledby="reset-title">
        <div className="auth-mark">
          <Icon name="lock" size={22} />
        </div>

        <p className="auth-eyebrow">VAWES / ACCOUNT</p>
        <h1 id="reset-title">Reset password</h1>
        <p className="auth-description">
          Choose a new password for your VAWES account.
        </p>

        {!token ? (
          <>
            <p className="auth-feedback is-error" role="alert">
              The password reset link is missing its token.
            </p>
            <p className="auth-switch">
              <Link to="/forgot-password">Request a new reset link</Link>
            </p>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>New password</span>
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
                  {visible ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>

            <label className="auth-field">
              <span>Confirm new password</span>
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

            <small className="auth-strength">
              At least 10 characters, including uppercase, lowercase and a number.
            </small>

            {error && (
              <p className="auth-feedback is-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="auth-feedback is-success" role="status">
                {success}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={busy || !!success}
            >
              {busy ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}

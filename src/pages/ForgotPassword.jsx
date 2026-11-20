
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api/client.js'
import Icon from '../components/Icon.jsx'
import '../auth.css'

export default function ForgotPassword() {
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
      const result = await apiGet('auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      setSuccess(result.message || 'If an account with that email exists, a password reset link will be sent.')
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
        <Link className="auth-home" to="/">Home</Link>
      </header>

      <section className="auth-card glass" aria-labelledby="forgot-title">
        <div className="auth-mark">
          <Icon name="lock" size={22} />
        </div>

        <p className="auth-eyebrow">VAWES / ACCOUNT</p>
        <h1 id="forgot-title">Forgot password?</h1>
        <p className="auth-description">
          Enter your account email address. If an account exists, we'll send you a password reset link.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email address</span>
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
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  )
}

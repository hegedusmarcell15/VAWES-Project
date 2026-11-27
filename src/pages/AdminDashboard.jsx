import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiList } from '../api/client.js'
import { useAuth } from '../AuthContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [users, setUsers] = useState([])
  const [artists, setArtists] = useState([])
  const [stats, setStats] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [userList, artistPage, songs, albums, playlists] = await Promise.all([
          apiGet('admin/users'),
          apiList('artists', { size: 100 }),
          apiGet('songs?page=1&pageSize=1'),
          apiGet('albums?page=1&pageSize=1'),
          apiGet('playlists?page=1&pageSize=1'),
        ])
        if (!active) return
        setUsers(userList)
        setArtists(artistPage.items)
        setStats({
          tracks: songs.total,
          albums: albums.total,
          artists: artistPage.total,
          playlists: playlists.total,
        })
        setDrafts(Object.fromEntries(artistPage.items.map((artist) => [
          artist.id,
          { bio: artist.bio ?? '', cover_url: artist.cover_url ?? '' },
        ])))
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }
    void load()
    return () => { active = false }
  }, [])

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

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { bio: '', cover_url: '' }), [field]: value },
    }))
  }

  const saveArtist = async (artist) => {
    const draft = drafts[artist.id] ?? { bio: '', cover_url: '' }
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const updated = await apiGet(`artists/${encodeURIComponent(artist.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: draft.bio, coverUrl: draft.cover_url }),
      })
      setArtists((current) => current.map((item) =>
        String(item.id) === String(artist.id) ? { ...item, ...updated } : item))
      setMessage(t('adminSaved'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const uploadHref = `${import.meta.env.BASE_URL}upload.html`

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
        <a className="auth-submit admin-upload-link" href={uploadHref}>{t('adminUpload')}</a>
        {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback is-success" role="status">{message}</p>}

        <div className="admin-grid">
          <section className="admin-panel glass" aria-labelledby="admin-catalog-title">
            <h2 id="admin-catalog-title">{t('adminCatalog')}</h2>
            {stats && (
              <div className="admin-stats">
                <span><strong>{stats.tracks}</strong>{t('adminTracks')}</span>
                <span><strong>{stats.albums}</strong>{t('adminAlbums')}</span>
                <span><strong>{stats.artists}</strong>{t('adminArtists')}</span>
                <span><strong>{stats.playlists}</strong>{t('adminPlaylists')}</span>
              </div>
            )}
          </section>

          <section className="admin-panel glass" aria-labelledby="admin-users-title">
            <h2 id="admin-users-title">{t('adminUsers')}</h2>
            {users.length === 0 ? (
              <p className="admin-muted">{t('adminNoUsers')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>{t('authUsername')}</th><th>{t('authEmail')}</th><th>{t('adminUsers')}</th></tr></thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td>{item.username}</td>
                        <td>{item.email}</td>
                        <td>{item.isAdmin ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="admin-panel glass" aria-labelledby="admin-artists-title">
          <h2 id="admin-artists-title">{t('adminArtistMetadata')}</h2>
          {artists.length === 0 ? (
            <p className="admin-muted">{t('catalogEmpty')}</p>
          ) : (
            <ul className="admin-artist-list">
              {artists.map((artist) => {
                const draft = drafts[artist.id] ?? { bio: '', cover_url: '' }
                return (
                  <li className="admin-artist" key={artist.id}>
                    <strong>{artist.name}</strong>
                    <label>
                      <span>{t('adminBio')}</span>
                      <textarea
                        value={draft.bio}
                        maxLength={2000}
                        rows={2}
                        onChange={(event) => updateDraft(artist.id, 'bio', event.target.value)}
                      />
                    </label>
                    <label>
                      <span>{t('adminCoverUrl')}</span>
                      <input
                        type="url"
                        value={draft.cover_url}
                        maxLength={500}
                        onChange={(event) => updateDraft(artist.id, 'cover_url', event.target.value)}
                      />
                    </label>
                    <button type="button" className="auth-submit" onClick={() => saveArtist(artist)} disabled={busy}>
                      {t('adminSave')}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

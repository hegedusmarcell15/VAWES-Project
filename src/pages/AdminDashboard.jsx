import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiList } from '../api/client.js'
import { fmt } from '../catalogUtils.js'
import { useAuth } from '../AuthContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'
import '../auth.css'

const tabs = [
  { id: 'overview', label: 'adminTabOverview', icon: 'shield' },
  { id: 'catalog', label: 'adminTabCatalog', icon: 'search' },
  { id: 'artists', label: 'adminTabArtists', icon: 'user' },
  { id: 'albums', label: 'adminTabAlbums', icon: 'disc' },
  { id: 'users', label: 'adminTabUsers', icon: 'users' },
  { id: 'playlists', label: 'adminTabPlaylists', icon: 'queue' },
  { id: 'upload', label: 'adminTabUpload', icon: 'upload' },
  { id: 'audit', label: 'adminTabAudit', icon: 'shield' },
  { id: 'status', label: 'adminTabStatus', icon: 'globe' },
]

const pageSize = 24
const searchableTabs = new Set(['catalog', 'artists', 'albums', 'users', 'playlists'])
const pagedTabs = new Set(['catalog', 'albums', 'playlists', 'audit'])

const isTab = (value) => tabs.some((tab) => tab.id === value)

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function Badge({ ok, trueLabel, falseLabel }) {
  return (
    <span className={`admin-badge ${ok ? 'is-ok' : 'is-warn'}`}>
      {ok ? trueLabel : falseLabel}
    </span>
  )
}

function Pager({ page, total, onPage, t }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages < 2) return null
  return (
    <div className="admin-pager">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        {t('adminPrevious')}
      </button>
      <span>{t('adminPage')} {page} / {pages}</span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages}>
        {t('adminNext')}
      </button>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = isTab(requestedTab) ? requestedTab : 'overview'
  const { user, logout } = useAuth()
  const { t } = useLanguage()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [resetLinks, setResetLinks] = useState({})

  const setTab = (next) => {
    setSearchParams(next === 'overview' ? {} : { tab: next })
    setError('')
    setMessage('')
    setEditing(null)
  }

  const refresh = () => setRefreshKey((value) => value + 1)

  useEffect(() => {
    setSearch('')
    setPage(1)
  }, [tab])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        let result
        const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        if (search.trim()) query.set('search', search.trim())

        switch (tab) {
          case 'overview':
            result = await apiGet('admin/summary')
            break
          case 'status':
            result = await apiGet('admin/health')
            break
          case 'catalog':
            result = await apiGet(`admin/songs?${query}`)
            break
          case 'albums':
            result = await apiGet(`admin/albums?${query}`)
            break
          case 'playlists':
            result = await apiGet(`admin/playlists?${query}`)
            break
          case 'audit':
            result = await apiGet(`admin/audit?${query}`)
            break
          case 'artists': {
            const artists = await apiList('artists', { search, size: 100 })
            result = { items: artists, total: artists.length }
            break
          }
          case 'users': {
            const users = await apiGet('admin/users')
            const term = search.trim().toLowerCase()
            const items = term
              ? users.filter((item) =>
                  `${item.username} ${item.email}`.toLowerCase().includes(term))
              : users
            result = { items, total: items.length }
            break
          }
          default:
            result = null
        }
        if (active) setData(result)
      } catch (loadError) {
        if (active) {
          setData(null)
          setError(loadError.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [tab, search, page, refreshKey])

  const handleLogout = async () => {
    setBusy(true)
    setError('')
    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const beginEdit = (type, item) => {
    const drafts = {
      song: {
        title: item.title ?? '',
        artist: item.artist ?? '',
        album: item.album ?? '',
        genre: item.genre ?? '',
      },
      album: {
        title: item.title ?? '',
        coverUrl: item.cover_url ?? '',
        releaseYear: item.release_year ?? '',
      },
      artist: {
        bio: item.bio ?? '',
        coverUrl: item.cover_url ?? '',
      },
    }
    setEditing({ type, id: item.id })
    setDraft(drafts[type])
    setError('')
    setMessage('')
  }

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const saveEdit = async (event) => {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const id = encodeURIComponent(editing.id)
      if (editing.type === 'song') {
        await apiGet(`admin/songs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            artist: draft.artist,
            album: draft.album,
            genre: draft.genre,
          }),
        })
      } else if (editing.type === 'album') {
        await apiGet(`admin/albums/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            coverUrl: draft.coverUrl,
            releaseYear: draft.releaseYear === '' ? null : Number(draft.releaseYear),
          }),
        })
      } else {
        await apiGet(`artists/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: draft.bio, coverUrl: draft.coverUrl }),
        })
      }
      setEditing(null)
      setMessage(t('adminSaved'))
      refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const refreshArtwork = async (type, item) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiGet(`admin/${type === 'album' ? 'albums' : 'artists'}/${encodeURIComponent(item.id)}/artwork`, {
        method: 'POST',
      })
      setMessage(result?.coverUrl ? t('adminArtworkUpdated') : t('adminNoArtwork'))
      refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (type, item) => {
    const confirmations = {
      song: 'adminConfirmDeleteSong',
      album: 'adminConfirmDeleteAlbum',
      playlist: 'adminConfirmDeletePlaylist',
      user: 'adminConfirmDeleteUser',
    }
    if (!window.confirm(t(confirmations[type]))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const routes = {
        song: `admin/songs/${encodeURIComponent(item.id)}`,
        album: `admin/albums/${encodeURIComponent(item.id)}`,
        playlist: `admin/playlists/${encodeURIComponent(item.id)}`,
        user: `admin/users/${item.id}`,
      }
      await apiGet(routes[type], { method: 'DELETE' })
      setMessage(t('adminSaved'))
      refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleAdmin = async (item) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await apiGet(`admin/users/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !item.isAdmin }),
      })
      setMessage(t('adminSaved'))
      refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const issueReset = async (item) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiGet(`admin/users/${item.id}/reset-password`, { method: 'POST' })
      setResetLinks((current) => ({ ...current, [item.id]: result }))
      setMessage(result.link ? t('adminResetIssued') : t('adminResetUnavailable'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const items = Array.isArray(data?.items) ? data.items : []
  const total = Number.isFinite(data?.total) ? data.total : items.length
  const showSearch = searchableTabs.has(tab)

  const editor = (fields) => (
    <form className="admin-inline-editor" onSubmit={saveEdit}>
      {fields.map(([key, label, type = 'text']) => (
        <label key={key}>
          <span>{label}</span>
          <input
            type={type}
            value={draft[key] ?? ''}
            maxLength={key === 'bio' ? 2000 : 500}
            onChange={(event) => updateDraft(key, event.target.value)}
          />
        </label>
      ))}
      <div className="admin-inline-actions">
        <button className="auth-submit" type="submit" disabled={busy}>{t('adminSave')}</button>
        <button className="admin-button" type="button" onClick={() => setEditing(null)}>{t('adminCancel')}</button>
      </div>
    </form>
  )

  const isEditing = (type, id) => editing?.type === type && String(editing.id) === String(id)

  const renderRows = () => {
    if (tab === 'catalog') {
      return items.map((song) => (
        <tr key={song.id}>
          <td>{song.title}</td>
          <td>{song.artist}</td>
          <td>{song.album || '—'}</td>
          <td>{song.genre || '—'}</td>
          <td>{fmt(song.duration_sec)}</td>
          <td><Badge ok={song.has_audio} trueLabel={t('adminPlayable')} falseLabel={t('adminMissingAudio')} /></td>
          <td className="admin-actions">
            <button type="button" onClick={() => beginEdit('song', song)}>{t('adminEdit')}</button>
            <button type="button" onClick={() => remove('song', song)} disabled={busy}>{t('adminDelete')}</button>
          </td>
          {isEditing('song', song.id) && (
            <td className="admin-editor-cell" colSpan={7}>
              {editor([
                ['title', t('adminTitle')],
                ['artist', t('adminArtist')],
                ['album', t('adminAlbum')],
                ['genre', t('adminGenre')],
              ])}
            </td>
          )}
        </tr>
      ))
    }
    if (tab === 'artists') {
      return items.map((artist) => (
        <tr key={artist.id}>
          <td>{artist.name}</td>
          <td className="admin-cell-clamp">{artist.bio || '—'}</td>
          <td><a href={artist.cover_url} target="_blank" rel="noreferrer">{artist.cover_url || '—'}</a></td>
          <td className="admin-actions">
            <button type="button" onClick={() => beginEdit('artist', artist)}>{t('adminEdit')}</button>
            <button type="button" onClick={() => refreshArtwork('artist', artist)} disabled={busy}>{t('adminRefreshArtwork')}</button>
          </td>
          {isEditing('artist', artist.id) && (
            <td className="admin-editor-cell" colSpan={4}>
              {editor([
                ['bio', t('adminBio')],
                ['coverUrl', t('adminCoverUrl')],
              ])}
            </td>
          )}
        </tr>
      ))
    }
    if (tab === 'albums') {
      return items.map((album) => (
        <tr key={album.id}>
          <td>{album.title}</td>
          <td>{album.artist}</td>
          <td>{album.release_year || '—'}</td>
          <td>{album.tracks}</td>
          <td><Badge ok={Boolean(album.cover_url)} trueLabel={<Icon name="check" size={13} />} falseLabel="—" /></td>
          <td className="admin-actions">
            <button type="button" onClick={() => beginEdit('album', album)}>{t('adminEdit')}</button>
            <button type="button" onClick={() => refreshArtwork('album', album)} disabled={busy}>{t('adminRefreshArtwork')}</button>
            <button type="button" onClick={() => remove('album', album)} disabled={busy}>{t('adminDelete')}</button>
          </td>
          {isEditing('album', album.id) && (
            <td className="admin-editor-cell" colSpan={6}>
              {editor([
                ['title', t('adminTitle')],
                ['coverUrl', t('adminCoverUrl')],
                ['releaseYear', t('adminReleaseYear'), 'number'],
              ])}
            </td>
          )}
        </tr>
      ))
    }
    if (tab === 'users') {
      return items.map((item) => (
        <tr key={item.id}>
          <td>{item.username}</td>
          <td>{item.email}</td>
          <td><Badge ok={item.isAdmin} trueLabel={<Icon name="check" size={13} />} falseLabel="—" /></td>
          <td>{formatDate(item.last_login_at)}</td>
          <td className="admin-actions">
            <button type="button" onClick={() => toggleAdmin(item)} disabled={busy}>
              {item.isAdmin ? t('adminDemote') : t('adminPromote')}
            </button>
            <button type="button" onClick={() => issueReset(item)} disabled={busy}>{t('adminIssueReset')}</button>
            <button type="button" onClick={() => remove('user', item)} disabled={busy}>{t('adminDelete')}</button>
          </td>
          {resetLinks[item.id] && (
            <td className="admin-editor-cell" colSpan={5}>
              <div className="admin-reset-link">
                <code>{resetLinks[item.id].token}</code>
                {resetLinks[item.id].link && <a href={resetLinks[item.id].link}>{resetLinks[item.id].link}</a>}
              </div>
            </td>
          )}
        </tr>
      ))
    }
    if (tab === 'playlists') {
      return items.map((playlist) => (
        <tr key={playlist.id}>
          <td>{playlist.name}</td>
          <td>{playlist.owner}</td>
          <td>{playlist.tracks}</td>
          <td>{playlist.minutes}</td>
          <td>{playlist.type}</td>
          <td className="admin-actions">
            <button type="button" onClick={() => remove('playlist', playlist)} disabled={busy}>{t('adminDelete')}</button>
          </td>
        </tr>
      ))
    }
    if (tab === 'audit') {
      return items.map((entry) => (
        <tr key={entry.id}>
          <td>{formatDate(entry.created_at)}</td>
          <td>{entry.actor_email}</td>
          <td><code>{entry.action}</code></td>
          <td>{entry.target}</td>
          <td className="admin-cell-clamp">{entry.detail || '—'}</td>
        </tr>
      ))
    }
    return []
  }

  const headers = {
    catalog: ['adminTitle', 'adminArtist', 'adminAlbum', 'adminGenre', 'adminDuration', 'adminStatus', 'adminActions'],
    artists: ['adminArtist', 'adminBio', 'adminCoverUrl', 'adminActions'],
    albums: ['adminTitle', 'adminArtist', 'adminReleaseYear', 'adminTracks', 'adminCoverUrl', 'adminActions'],
    users: ['authUsername', 'authEmail', 'adminStatus', 'adminAuditTime', 'adminActions'],
    playlists: ['adminTitle', 'adminPlaylistOwner', 'adminTracks', 'adminDuration', 'adminStatus', 'adminActions'],
    audit: ['adminAuditTime', 'adminAuditActor', 'adminAuditAction', 'adminAuditTarget', 'adminDetail'],
  }

  const renderContent = () => {
    if (tab === 'upload') {
      return (
        <div className="admin-panel glass admin-upload-frame">
          <iframe
            title={t('adminTabUpload')}
            src={`${import.meta.env.BASE_URL}upload.html`}
            loading="lazy"
          />
        </div>
      )
    }

    if (tab === 'overview' || tab === 'status') {
      const entries = tab === 'overview'
        ? [
            ['adminTracks', data?.tracks],
            ['adminPlayable', data?.playableTracks],
            ['adminMissingAudio', data?.missingAudio],
            ['adminAlbums', data?.albums],
            ['adminArtists', data?.artists],
            ['adminUsers', data?.users],
            ['adminPlaylists', data?.playlists],
            ['adminTabAudit', data?.auditEntries],
          ]
        : [
            ['adminDatabase', data?.databaseConnected],
            ['adminSmtp', data?.smtpConfigured],
            ['adminResetUrl', data?.resetUrlConfigured],
            ['adminStorage', data?.storageReady],
            ['adminAllowedAdmins', data?.allowedAdmins],
            ['adminApiDocs', data?.apiDocsEnabled],
          ]
      return (
        <section className="admin-panel glass">
          <h2>{t(tab === 'overview' ? 'adminOverview' : 'adminHealth')}</h2>
          {tab === 'status' && (
            <p className="admin-muted">
              <a href={`${import.meta.env.BASE_URL}scalar`} target="_blank" rel="noreferrer">{t('adminApiDocs')}</a>
            </p>
          )}
          <div className="admin-stats admin-stats-wide">
            {entries.map(([label, value]) => (
              <span key={label}>
                <strong>{typeof value === 'boolean' ? (value ? <Icon name="check" size={13} /> : '—') : (value ?? '—')}</strong>
                {t(label)}
              </span>
            ))}
          </div>
        </section>
      )
    }

    return (
      <section className="admin-panel glass">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>{(headers[tab] ?? []).map((key) => <th key={key}>{t(key)}</th>)}</tr>
            </thead>
            <tbody>{loading ? (
              <tr><td colSpan={(headers[tab] ?? []).length} className="admin-muted">{t('adminRefresh')}…</td></tr>
            ) : items.length ? renderRows() : (
              <tr><td colSpan={(headers[tab] ?? []).length} className="admin-muted">{t('adminNoRecords')}</td></tr>
            )}</tbody>
          </table>
        </div>
        {pagedTabs.has(tab) && <Pager page={page} total={total} onPage={setPage} t={t} />}
      </section>
    )
  }

  return (
    <main className="auth-page admin-console-page">
      <div className="auth-glow auth-glow-violet" aria-hidden="true" />
      <div className="auth-glow auth-glow-cyan" aria-hidden="true" />
      <header className="auth-header">
        <Link className="auth-brand" to="/">VAWES</Link>
        <button className="auth-home admin-logout" type="button" onClick={handleLogout} disabled={busy}>
          {busy ? t('adminSigningOut') : t('adminSignOut')}
        </button>
      </header>

      <section className="auth-card glass admin-console" aria-labelledby="admin-console-title">
        <div className="auth-mark"><Icon name="shield" size={22} /></div>
        <p className="auth-eyebrow">VAWES / ADMIN</p>
        <h1 id="admin-console-title">{t('adminDashboardTitle')}</h1>
        <p className="auth-description">{t('adminDashboardWelcome')}</p>
        <div className="admin-account">
          <span className="admin-account-label">{t('adminSignedInAs')}</span>
          <strong>{user?.email}</strong>
        </div>

        <nav className="admin-tabs" aria-label={t('adminDashboardTitle')}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'is-active' : ''}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} size={15} />
              {t(item.label)}
            </button>
          ))}
        </nav>

        {showSearch && (
          <div className="admin-toolbar">
            <label>
              <Icon name="search" size={15} />
              <input
                type="search"
                value={search}
                placeholder={t('adminSearch')}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              />
            </label>
            <button type="button" className="admin-button" onClick={refresh} disabled={busy}>
              {t('adminRefresh')}
            </button>
          </div>
        )}
        {(tab === 'overview' || tab === 'status' || tab === 'audit' || tab === 'upload') && (
          <div className="admin-toolbar admin-toolbar-end">
            <button type="button" className="admin-button" onClick={refresh} disabled={busy}>
              {t('adminRefresh')}
            </button>
          </div>
        )}

        {error && <p className="auth-feedback is-error" role="alert">{error}</p>}
        {message && <p className="auth-feedback is-success" role="status">{message}</p>}

        {renderContent()}
      </section>
    </main>
  )
}

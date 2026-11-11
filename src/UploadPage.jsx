import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, apiList, audioUrlForSong, deleteSong, uploadSong } from './api/client.js'
import { useLanguage } from './LanguageContext.jsx'

const pageSize = 100

export default function UploadPage() {
  const { language, setLanguage, t } = useLanguage()
  const translationRef = useRef(t)
  translationRef.current = t
  const fileInputRef = useRef(null)
  const [key, setKey] = useState('')
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [genre, setGenre] = useState('')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refreshTracks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const songs = []
      let total = 0
      let page = 1
      do {
        const result = await apiList('songs', { page, size: pageSize })
        if (!Array.isArray(result.items) || !Number.isFinite(result.total)) {
          throw new ApiError('The API returned an invalid song list.')
        }
        songs.push(...result.items)
        total = result.total
        page += 1
      } while (songs.length < total)
      setTracks(songs.filter((song) => song.file_path?.startsWith('uploads/')))
    } catch (loadError) {
      setError(loadError.message || translationRef.current('uploadApiOffline'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshTracks()
  }, [refreshTracks])

  const handleUpload = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!key.trim()) {
      setError(t('uploadKeyRequired'))
      return
    }
    if (!file) {
      setError(t('uploadFileRequired'))
      return
    }

    setBusy(true)
    setProgress(0)
    try {
      const result = await uploadSong({
        file, key, title, artist, album, genre, onProgress: setProgress,
      })
      setMessage(`${t('uploadComplete', result.song.title)} ${t(
        result.metadataSource === 'tags' ? 'uploadMetadataTags' : 'uploadMetadataForm'
      )}`)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTitle('')
      setArtist('')
      setAlbum('')
      setGenre('')
      await refreshTracks()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (song) => {
    if (!key.trim()) {
      setError(t('uploadKeyRequired'))
      return
    }
    if (!window.confirm(t('uploadDeleteConfirm', song.title))) return

    setError('')
    setMessage('')
    setBusy(true)
    try {
      await deleteSong(song.id, key)
      setMessage(t('uploadDeleteComplete', song.title))
      await refreshTracks()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="upload-page">
      <header className="upload-header">
        <a className="upload-brand" href="./" aria-label={`VAWES ${t('home')}`}>VAWES</a>
        <label className="upload-language">
          <span>{t('language')}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="hu">Magyar</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>
      </header>

      <section className="upload-content">
        <div className="upload-intro">
          <p className="upload-eyebrow">VAWES / ADMIN</p>
          <h1>{t('uploadTitle')}</h1>
          <p>{t('uploadDescription')}</p>
        </div>

        <form className="upload-form glass" onSubmit={handleUpload}>
          <label className="upload-field">
            <span>{t('uploadApiKey')}</span>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              required
            />
            <small>{t('uploadApiKeyHint')}</small>
          </label>

          <label className="upload-field">
            <span>{t('uploadFile')}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
            <small>{t('uploadFileHint')}</small>
          </label>

          <p className="upload-metadata-hint">{t('uploadMetadataHelp')}</p>
          <div className="upload-fields-grid">
            <label className="upload-field">
              <span>{t('uploadTitleField')}</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} />
            </label>
            <label className="upload-field">
              <span>{t('uploadArtistField')}</span>
              <input value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={150} />
            </label>
            <label className="upload-field">
              <span>{t('uploadAlbumField')}</span>
              <input value={album} onChange={(event) => setAlbum(event.target.value)} maxLength={200} />
            </label>
            <label className="upload-field">
              <span>{t('uploadGenreField')}</span>
              <input value={genre} onChange={(event) => setGenre(event.target.value)} maxLength={100} />
            </label>
          </div>

          {busy && (
            <div className="upload-progress">
              <span>{t('uploadProgress')} · {progress}%</span>
              <progress max="100" value={progress} />
            </div>
          )}
          {error && <p className="upload-feedback is-error" role="alert">{error}</p>}
          {message && <p className="upload-feedback is-success" role="status">{message}</p>}
          <button className="upload-submit" type="submit" disabled={busy}>
            {t('uploadSubmit')}
          </button>
        </form>

        <section className="upload-library glass" aria-labelledby="uploaded-tracks-title">
          <div className="upload-library-heading">
            <h2 id="uploaded-tracks-title">{t('uploadTrackList')}</h2>
            <button type="button" className="upload-secondary" onClick={refreshTracks} disabled={loading || busy}>
              {t('uploadRefresh')}
            </button>
          </div>
          {loading ? (
            <p className="upload-muted" aria-live="polite">{t('catalogLoading')}</p>
          ) : error && tracks.length === 0 ? (
            <p className="upload-muted">{t('uploadApiOffline')}</p>
          ) : tracks.length === 0 ? (
            <p className="upload-muted">{t('uploadNoTracks')}</p>
          ) : (
            <ul className="upload-track-list">
              {tracks.map((song) => (
                <li className="upload-track" key={song.id}>
                  <div className="upload-track-info">
                    <strong>{song.title}</strong>
                    <span>{song.artist}{song.album ? ` · ${song.album}` : ''}</span>
                  </div>
                  <audio controls preload="none" src={audioUrlForSong(song)} aria-label={`${t('uploadPreview')}: ${song.title}`} />
                  <button
                    type="button"
                    className="upload-delete"
                    onClick={() => handleDelete(song)}
                    disabled={busy}
                    aria-label={`${t('uploadDelete')}: ${song.title}`}
                  >
                    {t('uploadDelete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

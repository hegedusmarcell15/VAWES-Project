import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, apiList, audioUrlForSong, deleteSong, uploadSong } from './api/client.js'
import { useLanguage } from './LanguageContext.jsx'

const pageSize = 100
const maximumFileBytes = 50 * 1024 * 1024
const uploadConcurrency = 3
const tagFrameNames = { TIT2: 'title', TPE1: 'artist', TALB: 'album', TCON: 'genre' }

function decodeTag(bytes) {
  if (!bytes.length) return ''
  const encoding = bytes[0]
  const text = bytes.subarray(1)
  let decoder
  if (encoding === 1) decoder = new TextDecoder('utf-16')
  else if (encoding === 2) decoder = new TextDecoder('utf-16be')
  else if (encoding === 3) decoder = new TextDecoder('utf-8')
  else decoder = new TextDecoder('windows-1252')
  return decoder.decode(text).replace(/\0/g, '').trim()
}

async function extractTags(file) {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer())
  const metadata = { title: '', artist: '', album: '', genre: '' }
  if (bytes.length >= 10 && String.fromCharCode(...bytes.subarray(0, 3)) === 'ID3') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const version = bytes[3]
    const tagSize = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9]
    const end = Math.min(bytes.length, 10 + tagSize)
    let offset = 10
    while (offset + 10 <= end) {
      const frameId = String.fromCharCode(...bytes.subarray(offset, offset + 4))
      if (!/^[A-Z0-9]{4}$/.test(frameId)) break
      const frameSize = version >= 4
        ? ((bytes[offset + 4] & 0x7f) << 21) | ((bytes[offset + 5] & 0x7f) << 14) |
          ((bytes[offset + 6] & 0x7f) << 7) | (bytes[offset + 7] & 0x7f)
        : view.getUint32(offset + 4)
      const frameEnd = offset + 10 + frameSize
      if (frameSize <= 0 || frameEnd > end) break
      const field = tagFrameNames[frameId]
      if (field && !metadata[field]) metadata[field] = decodeTag(bytes.subarray(offset + 10, frameEnd))
      offset = frameEnd
    }
  }
  if (!metadata.title) metadata.title = file.name.replace(/\.mp3$/i, '')
  return metadata
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function UploadPage() {
  const { language, setLanguage, t } = useLanguage()
  const translationRef = useRef(t)
  translationRef.current = t
  const fileInputRef = useRef(null)
  const queueRef = useRef([])
  const pendingFileKeys = useRef(new Set())
  const busyRef = useRef(false)
  const [key, setKey] = useState('')
  const [queue, setQueue] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const replaceQueue = (update) => {
    const next = typeof update === 'function' ? update(queueRef.current) : update
    queueRef.current = next
    setQueue(next)
  }

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

  const addFiles = async (files) => {
    if (busyRef.current) return
    const selected = [...files].filter((file) => file.name.toLowerCase().endsWith('.mp3'))
    if (selected.length !== files.length) setError(t('uploadOnlyMp3'))
    if (!selected.length) return

    const seen = new Set(queueRef.current.map((item) => fileKey(item.file)))
    const accepted = selected.filter((file) => {
      const itemKey = fileKey(file)
      if (seen.has(itemKey) || pendingFileKeys.current.has(itemKey)) return false
      seen.add(itemKey)
      pendingFileKeys.current.add(itemKey)
      return true
    })
    if (accepted.length !== selected.length) setError(t('uploadDuplicateFile'))
    try {
      const prepared = await Promise.all(accepted.map(async (file) => {
        let metadata = { title: file.name.replace(/\.mp3$/i, ''), artist: '', album: '', genre: '' }
        let metadataError = ''
        try {
          metadata = await extractTags(file)
        } catch {
          metadataError = t('uploadTagReadFailed')
        }
        if (file.size > maximumFileBytes) metadataError = t('uploadFileTooLarge')
        return {
          id: crypto.randomUUID(),
          file,
          metadata,
          status: metadataError ? 'failed' : 'waiting',
          progress: 0,
          error: metadataError,
        }
      }))
      if (prepared.length) replaceQueue((current) => [...current, ...prepared])
    } finally {
      accepted.forEach((file) => pendingFileKeys.current.delete(fileKey(file)))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateQueuedFile = (id, changes) => {
    replaceQueue((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  const processUploads = async (items) => {
    if (busyRef.current || !items.length) return
    setError('')
    setMessage('')
    if (!key.trim()) {
      setError(t('uploadKeyRequired'))
      return
    }

    busyRef.current = true
    setBusy(true)
    items.forEach((item) => updateQueuedFile(item.id, { status: 'uploading', progress: 0, error: '' }))
    let nextIndex = 0
    let completed = 0
    let failed = 0
    const worker = async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex]
        nextIndex += 1
        try {
          await uploadSong({
            file: item.file,
            key,
            ...item.metadata,
            onProgress: (progress) => updateQueuedFile(item.id, { progress }),
          })
          completed += 1
          updateQueuedFile(item.id, { status: 'completed', progress: 100 })
        } catch (uploadError) {
          failed += 1
          updateQueuedFile(item.id, {
            status: 'failed',
            error: uploadError.message || t('uploadApiOffline'),
          })
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(uploadConcurrency, items.length) }, worker))
      await refreshTracks()
      setMessage(t('uploadSummary', completed, failed))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const handleUpload = () => {
    processUploads(queueRef.current.filter((item) => item.status === 'waiting'))
  }

  const retryFailed = (item) => {
    processUploads(item
      ? [item]
      : queueRef.current.filter((entry) => entry.status === 'failed' && entry.file.size <= maximumFileBytes))
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
    busyRef.current = true
    try {
      await deleteSong(song.id, key)
      setMessage(t('uploadDeleteComplete', song.title))
      await refreshTracks()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const completedCount = queue.filter((item) => item.status === 'completed').length
  const failedCount = queue.filter((item) => item.status === 'failed').length
  const remainingCount = queue.filter((item) => item.status === 'waiting' || item.status === 'uploading').length
  const overallProgress = queue.length
  ? Math.round(queue.reduce((total, item) => total + (item.status === 'completed' || item.status === 'failed' ? 100 : item.progress), 0) / queue.length)
    : 0

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

        <section className="upload-form glass">
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

          <div
            className={`upload-dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <span className="upload-drop-icon" aria-hidden="true">♫</span>
            <strong>{t('uploadDrop')}</strong>
            <span>{t('uploadFileHint')}</span>
            <button type="button" className="upload-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              {t('uploadSelectFiles')}
            </button>
            <input
              ref={fileInputRef}
              className="upload-visually-hidden"
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              onChange={(event) => addFiles(event.target.files ?? [])}
              aria-label={t('uploadSelectFiles')}
            />
          </div>

          {error && <p className="upload-feedback is-error" role="alert">{error}</p>}
          {message && <p className="upload-feedback is-success" role="status">{message}</p>}
        </section>

        <section className="upload-queue glass" aria-labelledby="upload-queue-title">
          <div className="upload-library-heading">
            <div>
              <h2 id="upload-queue-title">{t('uploadQueue')}</h2>
              <p className="upload-queue-count">{queue.length} {t('uploadFile')}</p>
            </div>
            <div className="upload-queue-actions">
              <button type="button" className="upload-secondary" onClick={() => retryFailed()} disabled={busy || failedCount === 0}>
                {t('uploadRetryFailed')}
              </button>
              <button type="button" className="upload-secondary" onClick={() => replaceQueue([])} disabled={busy || queue.length === 0}>
                {t('uploadClearQueue')}
              </button>
              <button type="button" className="upload-submit" onClick={handleUpload} disabled={busy || remainingCount === 0}>
                {t('uploadStartAll')}
              </button>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="upload-overall">
              <div className="upload-overall-heading">
                <strong>{t('uploadOverall')} · {overallProgress}%</strong>
                <span>{t('uploadCompletedCount')}: {completedCount} · {t('uploadFailedCount')}: {failedCount} · {t('uploadRemaining')}: {remainingCount}</span>
              </div>
              <progress max="100" value={overallProgress} />
            </div>
          )}

          {queue.length === 0 ? (
            <p className="upload-muted">{t('uploadQueueEmpty')}</p>
          ) : (
            <ul className="upload-queue-list">
              {queue.map((item) => (
                <li className="upload-queue-item" key={item.id}>
                  <div className="upload-queue-top">
                    <div className="upload-queue-file">
                      <strong title={item.file.name}>{item.file.name}</strong>
                      <span>{formatSize(item.file.size)}</span>
                    </div>
                    <span className={`upload-status is-${item.status}`}>
                      {t(item.status === 'waiting' ? 'uploadWaiting' : item.status === 'uploading' ? 'uploadUploading' : item.status === 'completed' ? 'uploadUploaded' : 'uploadFailed')}
                      {item.status === 'uploading' ? ` · ${item.progress}%` : ''}
                    </span>
                    {item.status === 'failed' && item.file.size <= maximumFileBytes && (
                      <button type="button" className="upload-secondary" onClick={() => retryFailed(item)} disabled={busy}>
                        {t('uploadRetry')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="upload-delete"
                      onClick={() => replaceQueue((current) => current.filter((entry) => entry.id !== item.id))}
                      disabled={busy}
                      aria-label={`${t('uploadRemoveFile')}: ${item.file.name}`}
                    >
                      {t('uploadRemoveFile')}
                    </button>
                  </div>
                  <div className="upload-fields-grid upload-queue-fields">
                    {[
                      ['title', 'uploadTitleField', 200],
                      ['artist', 'uploadArtistField', 150],
                      ['album', 'uploadAlbumField', 200],
                      ['genre', 'uploadGenreField', 100],
                    ].map(([field, label, maxLength]) => (
                      <label className="upload-field" key={field}>
                        <span>{t(label)}</span>
                        <input
                          value={item.metadata[field]}
                          maxLength={maxLength}
                          onChange={(event) => updateQueuedFile(item.id, {
                            metadata: { ...item.metadata, [field]: event.target.value },
                          })}
                          disabled={busy || item.status === 'completed'}
                        />
                      </label>
                    ))}
                  </div>
                  <progress className="upload-item-progress" max="100" value={item.status === 'completed' ? 100 : item.progress} />
                  {item.error && <p className="upload-item-error" role="alert">{item.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

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

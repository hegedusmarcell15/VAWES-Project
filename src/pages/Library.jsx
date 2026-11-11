import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { norm } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import { useAuth } from '../AuthContext.jsx'

function SortPicker({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const selected = options.find(([key]) => key === value) ?? options[0]

  useEffect(() => {
    const close = (event) => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return (
    <div className={`sort-picker ${open ? 'open' : ''}`} ref={pickerRef}>
      <button
        className="sort-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {selected[1]}
      </button>
      {open && (
        <div className="sort-menu" role="listbox" aria-label={label}>
          {options.map(([key, optionLabel]) => (
            <button
              key={key}
              className={`sort-option ${value === key ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={value === key}
              onClick={() => {
                onChange(key)
                setOpen(false)
              }}
            >
              <span>{optionLabel}</span>
              {value === key && <span className="sort-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Library() {
  const { catalog, status, createPlaylist, playlistError } = useCatalog()
  const { user } = useAuth()
  const { t, playlistName } = useLanguage()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const handleCreatePlaylist = async (event) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    try {
      await createPlaylist(name)
      setNewName('')
      setCreating(false)
      setFilter('mine')
      setActionMessage(t('playlistCreated'))
    } catch (error) {
      setActionMessage(error.message)
    }
  }

  const list = useMemo(() => catalog.playlists
    .filter((p) => (filter === 'all' || p.type === filter) && norm(p.name).includes(norm(q.trim())))
    .sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name, 'hu')
      : sort === 'length' ? b.minutes - a.minutes
      : a.recent - b.recent), [catalog.playlists, filter, q, sort])

  if (status === 'loading') return <CatalogSkeleton rows={6} />

  return (
    <>
      <div className="page-head">
        <h1>{t('library')}</h1>
        <div className="library-heading-actions">
          <p className="meta">{t('libraryCount', list.length)}</p>
          {user ? (
            <button type="button" className="chip on" onClick={() => setCreating((value) => !value)}>{t('createPlaylist')}</button>
          ) : <Link className="chip" to="/login">{t('authLogin')}</Link>}
        </div>
      </div>

      {creating && (
        <form className="playlist-create-form" onSubmit={handleCreatePlaylist}>
          <label className="playlist-create-field">
            <span>{t('newPlaylist')}</span>
            <input className="field" value={newName} maxLength={150} onChange={(event) => setNewName(event.target.value)} required autoFocus />
          </label>
          <button className="chip on" type="submit">{t('save')}</button>
          <button className="chip" type="button" onClick={() => setCreating(false)}>{t('cancel')}</button>
        </form>
      )}
      {(actionMessage || playlistError) && <p className="inline-notice" role="status">{actionMessage || playlistError}</p>}

      <div className="tools">
        {[[ 'all', t('all') ], ['mine', t('mine')], ['vawes', t('vawesMix')]].map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? 'on' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
        <SortPicker
          value={sort}
          onChange={setSort}
          options={[['recent', t('recent')], ['name', t('byName')], ['length', t('byLength')]]}
          label={t('recent')}
        />
        <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)}
               placeholder={t('librarySearch')} aria-label={t('librarySearch')} />
      </div>

      <section className="grid">
        {list.map((p) => (
          <Link key={p.id} className="card" to={`/lista/${p.id}`}>
            <div className="art" style={{ '--c': `var(--${p.color})` }}>
              {p.cover_url && <img src={p.cover_url} alt="" loading="lazy" decoding="async" />}
            </div>
            <h3>{playlistName(p.id)}</h3>
            <p className="muted">{t('tracks', p.tracks, p.minutes)}</p>
          </Link>
        ))}
      </section>
      {list.length === 0 && <p className="empty">{t('noLibrary')}</p>}
    </>
  )
}

import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fmt, norm } from '../catalogUtils.js'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import { useCatalog } from '../CatalogContext.jsx'
import Cover from '../components/Cover.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { AlbumLink, ArtistLink } from '../components/TrackLinks.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

const RECENT_KEY = 'vawes-recent-searches'

function readRecentSearches() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((value) => typeof value === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

function matches(value, query) {
  return norm(value).includes(query)
}

export default function Search() {
  const { catalog, status } = useCatalog()
  const [q, setQ] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [chip, setChip] = useState('all')
  const [recent, setRecent] = useState(readRecentSearches)
  const searchInputRef = useRef(null)
  const { current } = usePlayerState()
  const { play } = usePlayerActions()
  const { t, playlistName } = useLanguage()
  const term = q.trim()
  const query = norm(debouncedQuery)
  const active = query !== '' || chip !== 'all'
  const chips = [{ id: 'all', name: t('all') }, ...catalog.playlists.slice(0, 4).map((p) => ({ ...p, name: playlistName(p.id) }))]

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(q.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    if (!query || query !== norm(term)) return
    const next = [term, ...recent.filter((item) => norm(item) !== query)].slice(0, 8)
    setRecent(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }, [query, term])

  const results = useMemo(() => {
    const songs = catalog.songs.filter((song) => {
      if (chip !== 'all') {
        const selected = catalog.playlists.find((playlist) => String(playlist.id) === String(chip))
        if (!(selected?.song_ids ?? []).some((id) => String(id) === String(song.id))) return false
      }
      return !query || [song.title, song.artist, song.album].some((field) => matches(field, query))
    })
    const artists = query ? catalog.artists.filter((artist) => matches(artist.name, query)) : []
    const albums = query
      ? catalog.albums.filter((album) => [album.title, album.artist].some((field) => matches(field, query)))
      : []
    const playlists = query ? catalog.playlists.filter((playlist) => matches(playlist.name, query)) : []
    return { songs: songs.slice(0, 10), artists: artists.slice(0, 6), albums: albums.slice(0, 6), playlists: playlists.slice(0, 6) }
  }, [catalog, chip, query])

  if (status === 'loading') return <CatalogSkeleton rows={7} />

  const hasResults = Object.values(results).some((group) => group.length > 0)
  const clearRecent = () => {
    setRecent([])
    localStorage.removeItem(RECENT_KEY)
  }

  return (
    <>
      <div className={`search-box ${term ? 'has-text' : ''}`}>
        <button className="ico" type="button" aria-label={t('search')} onClick={() => searchInputRef.current?.focus()}><Icon name="search" size={18} /></button>
        <input ref={searchInputRef} type="search" value={q} onChange={(event) => setQ(event.target.value)} autoComplete="off"
          placeholder={t('searchPlaceholder')} aria-label={t('search')} />
        {term && <button className="clear" aria-label={t('clear')} onClick={() => setQ('')}><Icon name="close" size={15} /></button>}
      </div>

      <div className="chips">
        {chips.map((item) => (
          <button key={item.id} className={`chip ${chip === item.id ? 'on' : ''}`} onClick={() => setChip(item.id)}>{item.name}</button>
        ))}
      </div>

      {!active ? (
        <>
          {recent.length > 0 && (
            <section className="search-section">
              <div className="section-heading">
                <h2>{t('recentSearches')}</h2>
                <button className="text-button" type="button" onClick={clearRecent}>{t('clearRecent')}</button>
              </div>
              <div className="recent-searches">
                {recent.map((item) => <button className="chip" key={item} type="button" onClick={() => setQ(item)}>{item}</button>)}
              </div>
            </section>
          )}
          <section className="search-section">
            <h2>{t('browseMoods')}</h2>
            <div className="tiles">
              {catalog.playlists.slice(0, 12).map((playlist) => (
                <button key={playlist.id} className="tile" style={{ '--c': `var(--${playlist.color})` }} onClick={() => setChip(playlist.id)}>
                  {playlistName(playlist.id)}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : !hasResults ? (
        <p className="empty">{t('noResults')} <b>{term}</b>. {t('tryAgain')}</p>
      ) : (
        <div className="search-results">
          {results.songs.length > 0 && (
            <section className="search-section">
              <h2>{t('songsGroup')}</h2>
              <table>
                <thead><tr><th>{t('title')}</th><th className="col-album">{t('album')}</th><th>{t('duration')}</th><th /></tr></thead>
                <tbody>
                  {results.songs.map((song) => {
                    const playlist = catalog.playlists.find((item) => String(item.id) === String(song.playlist))
                    return (
                      <tr key={song.id} className={`row ${current.id === song.id ? 'playing' : ''}`} onClick={() => play(song)}>
                        <td><div className="t-cell">
                          <Cover color={playlist?.color ?? 'violet'} size="sm" image={song.cover_url} />
                          <span className="t">{song.title}<small className="result-artist"><ArtistLink id={song.artist_id}>{song.artist}</ArtistLink></small></span>
                        </div></td>
                        <td className="col-album"><AlbumLink id={song.album_id}>{song.album}</AlbumLink></td>
                        <td>{fmt(song.duration_sec)}</td>
                        <td><FavoriteButton song={song} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )}
          {results.artists.length > 0 && (
            <section className="search-section">
              <h2>{t('artistsGroup')}</h2>
              <div className="entity-grid">
                {results.artists.map((artist) => (
                  <ArtistLink key={artist.id} id={artist.id}>
                    <span className="entity-card glass">
                      <Cover color="violet" size="big" image={artist.cover_url} />
                      <strong>{artist.name}</strong><small>{t('artist')}</small>
                    </span>
                  </ArtistLink>
                ))}
              </div>
            </section>
          )}
          {results.albums.length > 0 && (
            <section className="search-section">
              <h2>{t('albumsGroup')}</h2>
              <div className="entity-grid">
                {results.albums.map((album) => (
                  <AlbumLink key={album.id} id={album.id}>
                    <span className="entity-card glass">
                      <Cover color="violet" size="big" image={album.cover_url} />
                      <strong>{album.title}</strong><small>{album.artist}</small>
                    </span>
                  </AlbumLink>
                ))}
              </div>
            </section>
          )}
          {results.playlists.length > 0 && (
            <section className="search-section">
              <h2>{t('playlistsGroup')}</h2>
              <div className="entity-grid">
                {results.playlists.map((playlist) => (
                  <Link key={playlist.id} className="entity-card glass" to={`/lista/${encodeURIComponent(playlist.id)}`}>
                    <Cover color={playlist.color} size="big" image={playlist.cover_url} />
                    <strong>{playlistName(playlist.id)}</strong><small>{t('tracks', playlist.tracks, playlist.minutes)}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

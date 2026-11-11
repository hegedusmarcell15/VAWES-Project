import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fmt } from '../catalogUtils.js'
import heroHeadlines from '../hero-headlines.json'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import { useCatalog } from '../CatalogContext.jsx'
import Cover from '../components/Cover.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { ArtistLink } from '../components/TrackLinks.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

function getGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('morning')
  if (hour < 18) return t('afternoon')
  if (hour < 22) return t('evening')
  return t('night')
}

function getHeadline(language) {
  const headlines = heroHeadlines[language] ?? heroHeadlines.hu
  const storageKey = `vawes-hero-headline-${language}`
  const previous = localStorage.getItem(storageKey)
  const available = headlines.filter((headline) => headline !== previous)
  const next = available[Math.floor(Math.random() * available.length)] ?? headlines[0]
  localStorage.setItem(storageKey, next)
  return next
}

function DiscoverHome() {
  const { catalog, status } = useCatalog()
  const { current } = usePlayerState()
  const { play } = usePlayerActions()
  const { language, t, playlistName } = useLanguage()
  const [headline, setHeadline] = useState(() => getHeadline(language))
  const headlineLanguage = useRef(language)
  useEffect(() => {
    if (headlineLanguage.current === language) return
    headlineLanguage.current = language
    setHeadline(getHeadline(language))
  }, [language])
  const [avatar, setAvatar] = useState(() => localStorage.getItem('vawes-avatar') ?? '')
  useEffect(() => {
    const updateAvatar = (event) => setAvatar(event.detail ?? '')
    window.addEventListener('vawes-avatar-change', updateAvatar)
    return () => window.removeEventListener('vawes-avatar-change', updateAvatar)
  }, [])
  const releases = catalog.songs.slice(0, 5)
  const featured = catalog.playlists.slice(0, 4)
  if (status === 'loading') return <CatalogSkeleton rows={5} />

  return (
    <div className="discover">
      <section className="welcome">
        <div className="hero-copy">
          <p className="greeting" aria-label={`${getGreeting(t)}, User`}>
            <span>{getGreeting(t)}, User</span>
          </p>
          <p className="eyebrow">{t('discovery')}</p>
          <h1><span className="hero-line">{headline}</span></h1>
          <p className="welcome-copy">{t('welcome')}</p>
        </div>
        <div className={`welcome-orb ${avatar ? 'has-avatar' : ''}`} aria-hidden="true">
          {avatar ? <img src={avatar} alt="" /> : <span />}
        </div>
      </section>

      <section className="discover-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('latest')}</p>
            <h2>{t('releases')}</h2>
          </div>
          <Link className="text-link" to="/kereses">{t('allTracks')} <Icon name="arrowRight" size={14} /></Link>
        </div>
        {status === 'ready' && releases.length === 0
          ? <p className="empty">{t('catalogEmpty')}</p>
          : <div className="release-list">
          {releases.map((song, index) => {
            const playlist = catalog.playlists.find((p) => String(p.id) === String(song.playlist))
            return (
              <div key={song.id} className={`release ${current.id === song.id ? 'active' : ''}`}>
                <span className="release-number">{String(index + 1).padStart(2, '0')}</span>
                <Cover color={playlist?.color ?? 'violet'} size="sm" image={song.cover_url} />
                <span className="release-copy">
                  <strong><button className="text-button" type="button" onClick={() => play(song)}>{song.title}</button></strong>
                  <small><ArtistLink id={song.artist_id}>{song.artist}</ArtistLink></small>
                </span>
                <span className="release-duration">{fmt(song.duration_sec)}</span>
                <FavoriteButton song={song} />
                <button className="release-play" type="button" aria-label={`${t('play')}: ${song.title}`} onClick={() => play(song)}><Icon name={current.id === song.id ? 'pause' : 'play'} size={13} /></button>
              </div>
            )
          })}
          </div>}
      </section>

      <section className="discover-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('curated')}</p>
            <h2>{t('moods')}</h2>
          </div>
          <Link className="text-link" to="/konyvtar">{t('playerLibrary')} <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className="mood-row">
          {featured.map((playlist) => (
            <Link key={playlist.id} className="mood-card" to={`/lista/${playlist.id}`}>
              <span className="mood-art" style={{ '--c': `var(--${playlist.color})` }}>
                {playlist.cover_url && <img src={playlist.cover_url} alt="" loading="lazy" decoding="async" />}
              </span>
              <span><strong>{playlistName(playlist.id)}</strong><small>{t('tracks', playlist.tracks, playlist.minutes)}</small></span>
              <span className="mood-arrow"><Icon name="external" size={15} /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function Home() {
  return <DiscoverHome />
}

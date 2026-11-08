import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { playlists, songs, fmt } from '../data.js'
import heroHeadlines from '../hero-headlines.json'
import { usePlayer } from '../PlayerContext.jsx'
import Cover from '../components/Cover.jsx'
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
  const { current, play } = usePlayer()
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
  const releases = songs.slice(0, 5)
  const featured = playlists.slice(0, 4)

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
        <div className="release-list">
          {releases.map((song, index) => {
            const playlist = playlists.find((p) => p.id === song.playlist)
            return (
              <button
                key={song.id}
                className={`release ${current.id === song.id ? 'active' : ''}`}
                onClick={() => play(song)}
              >
                <span className="release-number">{String(index + 1).padStart(2, '0')}</span>
                <Cover color={playlist.color} size="sm" image={song.cover_url} />
                <span className="release-copy">
                  <strong>{song.title}</strong>
                  <small>{song.artist}</small>
                </span>
                <span className="release-duration">{fmt(song.duration_sec)}</span>
                <span className="release-play"><Icon name={current.id === song.id ? 'pause' : 'play'} size={13} /></span>
              </button>
            )
          })}
        </div>
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
  const { id } = useParams()
  const { t, playlistName } = useLanguage()
  const pl = playlists.find((p) => p.id === id) ?? playlists[0]
  const list = useMemo(() => songs.filter((s) => s.playlist === pl.id), [pl.id])
  const { current, play } = usePlayer()
  if (!id) return <DiscoverHome />

  return (
    <>
      <div className="playlist-header">
        <Cover color={pl.color} size="big" image={pl.cover_url} />
        <div>
          <p className="meta">{t('playlist')}</p>
          <h1>{playlistName(pl.id)}</h1>
          <p className="meta">VAWES · {t('tracks', pl.tracks, pl.minutes)}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>{t('title')}</th><th>{t('album')}</th><th>{t('duration')}</th></tr></thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={s.id} className={`row ${current.id === s.id ? 'playing' : ''}`} onClick={() => play(s)}>
              <td>{i + 1}</td><td className="t">{s.title}</td><td>{s.artist} · {s.album}</td><td>{fmt(s.duration_sec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

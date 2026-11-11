import { useEffect, useState } from 'react'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import { fmt } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import Cover from './Cover.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'
import { AlbumLink, ArtistLink } from './TrackLinks.jsx'

export default function Player() {
  const { catalog } = useCatalog()
  const { current, playing, elapsed, duration, volume, muted, status, shuffle, repeat } = usePlayerState()
  const { toggle, seek, next, prev, changeVolume, toggleMute, toggleShuffle, cycleRepeat } = usePlayerActions()
  const [playStyle, setPlayStyle] = useState(() => localStorage.getItem('vawes-play-style') ?? 'prism')
  const { t } = useLanguage()
  useEffect(() => {
    const updateStyle = (event) => setPlayStyle(event.detail)
    window.addEventListener('vawes-play-style-change', updateStyle)
    return () => window.removeEventListener('vawes-play-style-change', updateStyle)
  }, [])
  const color = catalog.playlists.find((p) => String(p.id) === String(current.playlist))?.color ?? 'violet'
  const pct = duration ? Math.min(100, (elapsed / duration) * 100) : 0
  const repeatLabel = repeat === 'one' ? t('repeatOne') : repeat === 'all' ? t('repeatAll') : t('repeatOff')
  const playbackMessage = status === 'loading'
    ? t('audioLoading')
    : status === 'unavailable'
      ? t('audioUnavailable')
      : status === 'error'
        ? t('audioError')
        : ''

  return (
    <footer className="player glass">
      <div className="track-info">
        <Cover color={color} size="sm" image={current.cover_url} />
        <div>
          <p>{current.title}</p>
          <p className="muted">
            <ArtistLink id={current.artist_id}>{current.artist}</ArtistLink>
            {' · '}
            <AlbumLink id={current.album_id}>{current.album}</AlbumLink>
          </p>
          {playbackMessage && <p className="player-message" role="status">{playbackMessage}</p>}
        </div>
      </div>
      <div className="controls">
        <button aria-label={t('shuffle')} aria-pressed={shuffle} className={shuffle ? 'is-active' : ''} onClick={toggleShuffle}><Icon name="shuffle" /></button>
        <button aria-label={t('previous')} onClick={prev}><Icon name="previous" /></button>
        <button id="playBtn" className={`play-style-${playStyle} ${playing ? 'is-playing' : ''}`} aria-label={playing ? t('pause') : t('play')} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={15} /></button>
        <button aria-label={t('next')} onClick={next}><Icon name="next" /></button>
        <button aria-label={repeatLabel} title={repeatLabel} aria-pressed={repeat !== 'off'} className={repeat !== 'off' ? 'is-active' : ''} onClick={cycleRepeat}><Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} /></button>
      </div>
      <div className="progress">
        <span>{fmt(elapsed)}</span>
        <div className={`timeline-shell ${playing ? 'is-playing' : ''}`} style={{ '--progress': `${pct}%` }}>
          <span className="timeline-glow" aria-hidden="true" />
          <input
            className="timeline"
            type="range"
            min="0"
            max={duration || current.duration_sec}
            step="1"
            value={Math.min(elapsed, duration || current.duration_sec)}
            onChange={(event) => seek(event.target.value)}
            aria-label={`${current.title} progress`}
          />
        </div>
        <span>{fmt(duration || current.duration_sec)}</span>
      </div>
      <div className="volume-control">
        <button aria-label={muted || volume === 0 ? t('unmute') : t('mute')} onClick={toggleMute}>
          <Icon name={muted || volume === 0 ? 'volumeMuted' : 'volume'} />
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          aria-label={t('volume')}
          onChange={(event) => changeVolume(event.target.value)}
        />
      </div>
    </footer>
  )
}

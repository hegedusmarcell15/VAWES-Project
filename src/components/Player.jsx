import { useEffect, useState } from 'react'
import { usePlayer } from '../PlayerContext.jsx'
import { playlists, fmt } from '../data.js'
import Cover from './Cover.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'

export default function Player() {
  const { current, playing, elapsed, toggle, seek, next, prev } = usePlayer()
  const [playStyle, setPlayStyle] = useState(() => localStorage.getItem('vawes-play-style') ?? 'prism')
  const { t } = useLanguage()
  useEffect(() => {
    const updateStyle = (event) => setPlayStyle(event.detail)
    window.addEventListener('vawes-play-style-change', updateStyle)
    return () => window.removeEventListener('vawes-play-style-change', updateStyle)
  }, [])
  const color = playlists.find((p) => p.id === current.playlist)?.color ?? 'violet'
  const pct = Math.min(100, (elapsed / current.duration_sec) * 100)

  return (
    <footer className="player glass">
      <div className="track-info">
        <Cover color={color} size="sm" image={current.cover_url} />
        <div><p>{current.title}</p><p className="muted">{current.artist} · {current.album}</p></div>
      </div>
      <div className="controls">
        <button aria-label={t('previous')} onClick={prev}><Icon name="previous" /></button>
        <button id="playBtn" className={`play-style-${playStyle} ${playing ? 'is-playing' : ''}`} aria-label={playing ? t('pause') : t('play')} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={15} /></button>
        <button aria-label={t('next')} onClick={next}><Icon name="next" /></button>
      </div>
      <div className="progress">
        <span>{fmt(elapsed)}</span>
        <div className={`timeline-shell ${playing ? 'is-playing' : ''}`} style={{ '--progress': `${pct}%` }}>
          <span className="timeline-glow" aria-hidden="true" />
          <input
            className="timeline"
            type="range"
            min="0"
            max={current.duration_sec}
            step="1"
            value={Math.min(elapsed, current.duration_sec)}
            onChange={(event) => seek(event.target.value)}
            aria-label={`${current.title} progress`}
          />
        </div>
        <span>{fmt(current.duration_sec)}</span>
      </div>
    </footer>
  )
}

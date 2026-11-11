import { useMemo } from 'react'
import { fmt } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { AlbumLink, ArtistLink } from '../components/TrackLinks.jsx'
import { useLanguage } from '../LanguageContext.jsx'

export default function Favorites() {
  const { catalog, favorites, status } = useCatalog()
  const { current } = usePlayerState()
  const { play, playQueue } = usePlayerActions()
  const { t } = useLanguage()
  const songs = useMemo(() => catalog.songs.filter((song) => favorites.includes(song.id)), [catalog.songs, favorites])

  if (status === 'loading') return <CatalogSkeleton rows={6} />
  return (
    <>
      <div className="page-head">
        <h1>{t('favorites')}</h1>
        {songs.length > 0 && <button className="chip on" type="button" onClick={() => playQueue(songs)}>{t('playAll')}</button>}
      </div>
      {songs.length === 0 ? <p className="empty">{t('noFavorites')}</p> : (
        <table>
          <thead><tr><th>{t('title')}</th><th>{t('album')}</th><th>{t('duration')}</th><th /></tr></thead>
          <tbody>{songs.map((song) => (
            <tr key={song.id} className={`row ${current.id === song.id ? 'playing' : ''}`} onClick={() => play(song, songs)}>
              <td><span className="t">{song.title}<small className="result-artist"><ArtistLink id={song.artist_id}>{song.artist}</ArtistLink></small></span></td>
              <td><AlbumLink id={song.album_id}>{song.album}</AlbumLink></td>
              <td>{fmt(song.duration_sec)}</td>
              <td><FavoriteButton song={song} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  )
}

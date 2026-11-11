import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { fmt } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import Cover from '../components/Cover.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { AlbumLink, ArtistLink } from '../components/TrackLinks.jsx'
import { useLanguage } from '../LanguageContext.jsx'

export default function Artist() {
  const { id } = useParams()
  const { catalog, status } = useCatalog()
  const { current } = usePlayerState()
  const { play, playQueue } = usePlayerActions()
  const { t } = useLanguage()
  const artist = catalog.artists.find((item) => String(item.id) === String(id))
  const tracks = useMemo(() => artist
    ? catalog.songs.filter((song) => String(song.artist_id) === String(artist.id) || song.artist === artist.name)
    : [], [artist, catalog.songs])
  const discography = useMemo(() => artist
    ? catalog.albums.filter((album) => String(album.artist_id) === String(artist.id))
    : [], [artist, catalog.albums])

  if (status === 'loading') return <CatalogSkeleton rows={8} />
  if (!artist) return <p className="empty">{t('catalogEmpty')}</p>

  const popular = [...tracks].sort((a, b) => b.duration_sec - a.duration_sec).slice(0, 8)
  return (
    <>
      <section className="artist-hero">
        <Cover color="violet" size="big" image={artist.cover_url} />
        <div>
          <p className="meta">{t('artist')}</p>
          <h1>{artist.name}</h1>
          <p className="meta">{artist.bio || t('artistBio')}</p>
        </div>
      </section>
      <section className="search-section">
        <div className="section-heading">
          <h2>{t('popularTracks')}</h2>
          {popular.length > 0 && <button className="chip" type="button" onClick={() => playQueue(popular)}>{t('playAll')}</button>}
        </div>
        {popular.length === 0 ? <p className="empty">{t('catalogEmpty')}</p> : (
          <table>
            <thead><tr><th>{t('title')}</th><th>{t('album')}</th><th>{t('duration')}</th><th /></tr></thead>
            <tbody>{popular.map((song) => (
              <tr key={song.id} className={`row ${current.id === song.id ? 'playing' : ''}`} onClick={() => play(song, popular)}>
                <td>{song.title}</td>
                <td><AlbumLink id={song.album_id}>{song.album}</AlbumLink></td>
                <td>{fmt(song.duration_sec)}</td>
                <td><FavoriteButton song={song} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      <section className="search-section">
        <h2>{t('discography')}</h2>
        {discography.length === 0 ? <p className="empty">{t('catalogEmpty')}</p> : (
          <div className="entity-grid">
            {discography.map((album) => (
              <AlbumLink key={album.id} id={album.id}>
                <span className="entity-card glass">
                  <Cover color="violet" size="big" image={album.cover_url} />
                  <strong>{album.title}</strong><small>{artist.name} · {fmt(album.duration_sec)}</small>
                </span>
              </AlbumLink>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

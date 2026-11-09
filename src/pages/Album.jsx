import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fmt } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import Cover from '../components/Cover.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { ArtistLink } from '../components/TrackLinks.jsx'
import { useLanguage } from '../LanguageContext.jsx'

export default function Album() {
  const { id } = useParams()
  const { catalog, status, updatePlaylist } = useCatalog()
  const { current } = usePlayerState()
  const { play, playQueue } = usePlayerActions()
  const { t, playlistName } = useLanguage()
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  const [notice, setNotice] = useState('')
  const album = catalog.albums.find((item) => String(item.id) === String(id))
  const tracks = useMemo(() => album
    ? catalog.songs.filter((song) => String(song.album_id) === String(album.id))
    : [], [album, catalog.songs])
  const artist = album
    ? catalog.artists.find((item) => String(item.id) === String(album.artist_id))
    : null

  if (status === 'loading') return <CatalogSkeleton rows={7} />
  if (!album) return <p className="empty">{t('catalogEmpty')}</p>

  const addAlbumToPlaylist = () => {
    const playlist = catalog.playlists.find((item) => String(item.id) === String(selectedPlaylist))
    if (!playlist) return
    const existing = new Set((playlist.song_ids ?? []).map(String))
    updatePlaylist(playlist.id, { song_ids: [...playlist.song_ids, ...tracks.map((song) => song.id).filter((songId) => !existing.has(String(songId)))] })
    setNotice(t('addedToPlaylist'))
  }
  const duration = tracks.reduce((total, song) => total + song.duration_sec, 0) || album.duration_sec

  return (
    <>
      <section className="album-hero">
        <Cover color="violet" size="big" image={album.cover_url} />
        <div>
          <p className="meta">{t('album')}</p>
          <h1>{album.title}</h1>
          <p className="meta">{artist
            ? <ArtistLink id={artist.id}>{artist.name}</ArtistLink>
            : <ArtistLink id={album.artist_id}>{album.artist}</ArtistLink>} · {t('tracks', tracks.length || album.tracks, Math.ceil(duration / 60))}</p>
          <div className="album-actions">
            <button className="chip on" type="button" onClick={() => playQueue(tracks)}>{t('playAll')}</button>
            <select className="field" aria-label={t('choosePlaylist')} value={selectedPlaylist} onChange={(event) => setSelectedPlaylist(event.target.value)}>
              <option value="">{t('choosePlaylist')}</option>
              {catalog.playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlistName(playlist.id)}</option>)}
            </select>
            <button className="chip" type="button" disabled={!selectedPlaylist} onClick={addAlbumToPlaylist}>{t('addToPlaylist')}</button>
          </div>
          {notice && <p className="inline-notice" role="status">{notice}</p>}
        </div>
      </section>
      <section className="search-section">
        <h2>{t('albumTracks')}</h2>
        {tracks.length === 0 ? <p className="empty">{t('catalogEmpty')}</p> : (
          <table>
            <thead><tr><th>#</th><th>{t('title')}</th><th>{t('duration')}</th><th /></tr></thead>
            <tbody>{tracks.map((song, index) => (
              <tr key={song.id} className={`row ${current.id === song.id ? 'playing' : ''}`} onClick={() => play(song, tracks)}>
                <td>{index + 1}</td>
                <td>{song.title}</td>
                <td>{fmt(song.duration_sec)}</td>
                <td><FavoriteButton song={song} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {artist && <p className="meta"><Link className="text-link" to={`/eloado/${artist.id}`}>{artist.name}</Link></p>}
    </>
  )
}

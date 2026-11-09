import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmt } from '../catalogUtils.js'
import { useCatalog } from '../CatalogContext.jsx'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'
import CatalogSkeleton from '../components/CatalogSkeleton.jsx'
import Cover from '../components/Cover.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { AlbumLink, ArtistLink } from '../components/TrackLinks.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

function shuffleSongs(songs) {
  const shuffled = [...songs]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

export default function Playlist() {
  const { id } = useParams()
  const { catalog, status, updatePlaylist } = useCatalog()
  const { current } = usePlayerState()
  const { play, playQueue } = usePlayerActions()
  const { t, playlistName } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [notice, setNotice] = useState('')
  const playlist = catalog.playlists.find((item) => String(item.id) === String(id))
  const songs = useMemo(() => playlist
    ? (playlist.song_ids ?? []).map((songId) => catalog.songs.find((song) => String(song.id) === String(songId))).filter(Boolean)
    : [], [catalog.songs, playlist])

  if (status === 'loading') return <CatalogSkeleton rows={8} />
  if (!playlist) return <p className="empty">{t('catalogEmpty')}</p>

  const startEditing = () => {
    setDraftName(playlist.name)
    setEditing(true)
    setNotice('')
  }
  const saveName = (event) => {
    event.preventDefault()
    const name = draftName.trim()
    if (!name) {
      setNotice(t('playlistNameRequired'))
      return
    }
    updatePlaylist(playlist.id, { name })
    setEditing(false)
    setNotice(t('playlistUpdated'))
  }
  const updateSongs = (nextSongs) => {
    updatePlaylist(playlist.id, { song_ids: nextSongs.map((song) => song.id) })
    setNotice(t('playlistUpdated'))
  }
  const moveSong = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= songs.length) return
    const next = [...songs]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateSongs(next)
  }

  return (
    <>
      <section className="playlist-header">
        <Cover color={playlist.color} size="big" image={playlist.cover_url} />
        <div className="playlist-heading-copy">
          <p className="meta">{t('playlist')}</p>
          {editing ? (
            <form className="rename-form" onSubmit={saveName}>
              <input className="field" value={draftName} maxLength="150" autoFocus aria-label={t('rename')} onChange={(event) => setDraftName(event.target.value)} />
              <button className="chip on" type="submit">{t('save')}</button>
              <button className="chip" type="button" onClick={() => setEditing(false)}>{t('cancel')}</button>
            </form>
          ) : <h1>{playlistName(playlist.id)}</h1>}
          <p className="meta">VAWES · {t('tracks', songs.length, playlist.minutes)}</p>
          <div className="playlist-actions">
            <button className="chip on" type="button" disabled={!songs.length} onClick={() => playQueue(songs)}>{t('playAll')}</button>
            <button className="chip" type="button" disabled={!songs.length} onClick={() => playQueue(shuffleSongs(songs))}><Icon name="shuffle" size={15} />{t('shuffle')}</button>
            <button className="chip" type="button" onClick={startEditing}><Icon name="edit" size={15} />{t('playlistEdit')}</button>
          </div>
          {notice && <p className="inline-notice" role="status">{notice}</p>}
        </div>
      </section>
      {songs.length === 0 ? <p className="empty">{t('catalogEmpty')}</p> : (
        <table>
          <thead><tr><th>#</th><th>{t('title')}</th><th>{t('album')}</th><th>{t('duration')}</th><th /></tr></thead>
          <tbody>{songs.map((song, index) => (
            <tr key={song.id} className={`row ${current.id === song.id ? 'playing' : ''}`} onClick={() => play(song, songs)}>
              <td>{index + 1}</td>
              <td><span className="t">{song.title}<small className="result-artist"><ArtistLink id={song.artist_id}>{song.artist}</ArtistLink></small></span></td>
              <td><AlbumLink id={song.album_id}>{song.album}</AlbumLink></td>
              <td>{fmt(song.duration_sec)}</td>
              <td className="track-actions">
                <FavoriteButton song={song} />
                {editing && (
                  <>
                    <button className="icon-action" type="button" aria-label={`${t('moveUp')}: ${song.title}`} disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveSong(index, -1) }}><Icon name="up" size={16} /></button>
                    <button className="icon-action" type="button" aria-label={`${t('moveDown')}: ${song.title}`} disabled={index === songs.length - 1} onClick={(event) => { event.stopPropagation(); moveSong(index, 1) }}><Icon name="down" size={16} /></button>
                    <button className="icon-action remove-track" type="button" aria-label={`${t('removeFromPlaylist')}: ${song.title}`} onClick={(event) => { event.stopPropagation(); updateSongs(songs.filter((item) => item.id !== song.id)) }}><Icon name="close" size={16} /></button>
                  </>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  )
}

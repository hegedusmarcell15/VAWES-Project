import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import snapshot from '../public/catalog.snapshot.json'
import { loadCatalog } from './api/client.js'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [state, setState] = useState({
    catalog: snapshot,
    status: 'loading',
    source: 'snapshot',
    error: null,
  })
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vawes-favorites') ?? '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [playlistOverrides, setPlaylistOverrides] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vawes-playlist-overrides') ?? '{}')
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    const controller = new AbortController()
    loadCatalog(controller.signal).then((result) => {
      setState({ ...result, status: 'ready' })
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setState({ catalog: snapshot, status: 'ready', source: 'snapshot', error })
      }
    })
    return () => controller.abort()
  }, [])

  const toggleFavorite = (songId) => {
    setFavorites((current) => {
      const next = current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId]
      localStorage.setItem('vawes-favorites', JSON.stringify(next))
      return next
    })
  }
  const updatePlaylist = (playlistId, changes) => {
    setPlaylistOverrides((current) => {
      const key = String(playlistId)
      const previous = current[key] ?? {}
      const nextOverride = { ...previous, ...changes }
      if (changes.song_ids) {
        const byId = new Map(state.catalog.songs.map((song) => [String(song.id), song]))
        const tracks = changes.song_ids.map((id) => byId.get(String(id))).filter(Boolean)
        nextOverride.tracks = tracks.length
        nextOverride.minutes = Math.round(tracks.reduce((total, song) => total + song.duration_sec, 0) / 60)
      }
      const next = { ...current, [key]: nextOverride }
      localStorage.setItem('vawes-playlist-overrides', JSON.stringify(next))
      return next
    })
  }

  const catalog = useMemo(() => ({
    ...state.catalog,
    playlists: state.catalog.playlists.map((playlist) => ({
      ...playlist,
      ...playlistOverrides[String(playlist.id)],
    })),
  }), [playlistOverrides, state.catalog])
  const value = useMemo(() => ({
    ...state,
    catalog,
    favorites,
    toggleFavorite,
    updatePlaylist,
  }), [catalog, favorites, playlistOverrides, state])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)

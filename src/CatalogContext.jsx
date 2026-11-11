import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import snapshot from '../public/catalog.snapshot.json'
import { apiGet, loadCatalog } from './api/client.js'
import { useAuth } from './AuthContext.jsx'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const { user, status: authStatus } = useAuth()
  const [state, setState] = useState({
    catalog: snapshot,
    status: 'loading',
    source: 'snapshot',
    error: null,
  })
  const [favorites, setFavorites] = useState([])
  const [favoriteError, setFavoriteError] = useState('')
  const [myPlaylists, setMyPlaylists] = useState([])
  const [playlistError, setPlaylistError] = useState('')
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

  useEffect(() => {
    let active = true
    if (authStatus !== 'ready') return () => { active = false }
    if (!user) {
      setFavorites([])
      setFavoriteError('')
      return () => { active = false }
    }
    setFavorites([])
    setFavoriteError('')
    const loadFavorites = async () => {
      try {
        const songs = []
        let total = 0
        let page = 1
        do {
          const result = await apiGet(`favorites?page=${page}&pageSize=100`)
          if (!Array.isArray(result.items) || !Number.isFinite(result.total))
            throw new Error('The API returned an invalid favorites list.')
          songs.push(...result.items)
          total = result.total
          page += 1
        } while (songs.length < total)
        if (active) setFavorites(songs.map((song) => song.id))
      } catch (error) {
        if (active) setFavoriteError(error.message)
      }
    }
    loadFavorites()
    return () => { active = false }
  }, [authStatus, user])

  useEffect(() => {
    let active = true
    if (authStatus !== 'ready') return () => { active = false }
    if (!user) {
      setMyPlaylists([])
      setPlaylistError('')
      return () => { active = false }
    }
    setMyPlaylists([])
    setPlaylistError('')
    apiGet('playlists/mine').then((items) => {
      if (active) {
        setMyPlaylists(items)
        setPlaylistError('')
      }
    }).catch((error) => {
      if (active) setPlaylistError(error.message)
    })
    return () => { active = false }
  }, [authStatus, user])

  const toggleFavorite = async (songId) => {
    if (!user) return false
    const id = String(songId)
    const isFavorite = favorites.some((favoriteId) => String(favoriteId) === id)
    try {
      setFavoriteError('')
      await apiGet(`favorites/${encodeURIComponent(id)}`, { method: isFavorite ? 'DELETE' : 'PUT' })
      setFavorites((current) => isFavorite
        ? current.filter((favoriteId) => String(favoriteId) !== id)
        : [...current, id])
      return true
    } catch (error) {
      setFavoriteError(error.message)
      return false
    }
  }
  const updatePlaylist = async (playlistId, changes) => {
    const personal = myPlaylists.find((playlist) => String(playlist.id) === String(playlistId))
    if (personal && user) {
      const byId = new Map(state.catalog.songs.map((song) => [String(song.id), song]))
      const next = { ...personal, ...changes }
      if (changes.song_ids) {
        const ids = changes.song_ids.map(String)
        const songs = ids.map((id) => byId.get(id)).filter(Boolean)
        next.song_ids = ids
        next.tracks = songs.length
        next.minutes = Math.round(songs.reduce((total, song) => total + song.duration_sec, 0) / 60)
      }
      try {
        setPlaylistError('')
        await apiGet(`playlists/${encodeURIComponent(playlistId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: next.name, songIds: next.song_ids ?? [] }),
        })
        setMyPlaylists((current) => current.map((playlist) =>
          String(playlist.id) === String(playlistId) ? next : playlist))
      } catch (error) {
        setPlaylistError(error.message)
        throw error
      }
      return
    }

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

  const createPlaylist = async (name) => {
    try {
      setPlaylistError('')
      const created = await apiGet('playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setMyPlaylists((current) => [...current, created])
      return created
    } catch (error) {
      setPlaylistError(error.message)
      throw error
    }
  }

  const deletePlaylist = async (playlistId) => {
    await apiGet(`playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' })
    setMyPlaylists((current) => current.filter((playlist) => String(playlist.id) !== String(playlistId)))
  }

  const catalog = useMemo(() => ({
    ...state.catalog,
    playlists: [...state.catalog.playlists, ...myPlaylists.filter((playlist) =>
      !state.catalog.playlists.some((existing) => String(existing.id) === String(playlist.id)))].map((playlist) => ({
      ...playlist,
      ...playlistOverrides[String(playlist.id)],
    })),
  }), [myPlaylists, playlistOverrides, state.catalog])
  const value = useMemo(() => ({
    ...state,
    catalog,
    favorites,
    favoriteError,
    playlistError,
    toggleFavorite,
    updatePlaylist,
    createPlaylist,
    deletePlaylist,
  }), [catalog, favorites, favoriteError, myPlaylists, playlistError, playlistOverrides, state])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)

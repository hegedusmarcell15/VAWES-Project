import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from './CatalogContext.jsx'
import { audioUrlForSong } from './api/client.js'

const StateCtx = createContext(null)
const ActionsCtx = createContext(null)
export const usePlayerState = () => useContext(StateCtx)
export const usePlayerActions = () => useContext(ActionsCtx)

const loadSavedPlayer = (songs) => {
  try {
    const saved = JSON.parse(localStorage.getItem('vawes-player') ?? '{}')
    return {
      current: songs.find((song) => song.id === saved.trackId) ?? songs[0],
      elapsed: Number.isFinite(saved.position) && saved.position >= 0 ? saved.position : 0,
      volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 0.8,
      muted: Boolean(saved.muted),
    }
  } catch {
    return { current: songs[0], elapsed: 0, volume: 0.8, muted: false }
  }
}

const sourceFor = audioUrlForSong

export function PlayerProvider({ children }) {
  const { catalog } = useCatalog()
  const songs = catalog.songs
  const [saved] = useState(() => loadSavedPlayer(songs))
  const [current, setCurrent] = useState(saved.current)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(saved.elapsed)
  const [duration, setDuration] = useState(saved.current?.duration_sec ?? 0)
  const [volume, setVolume] = useState(saved.volume)
  const [muted, setMuted] = useState(saved.muted)
  const [status, setStatus] = useState('idle')
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off')
  const audioRef = useRef(null)
  const pendingSeekRef = useRef(saved.elapsed)
  const requestIdRef = useRef(0)
  const historyRef = useRef([])
  const queueRef = useRef(songs)
  const currentRef = useRef(current)
  const repeatRef = useRef(repeat)
  const stepRef = useRef(null)
  currentRef.current = current
  repeatRef.current = repeat

  const startAudio = useCallback((song, position = 0) => {
    const audio = audioRef.current
    const requestId = ++requestIdRef.current
    pendingSeekRef.current = Math.max(0, position)
    setCurrent(song)
    setElapsed(Math.max(0, position))
    setDuration(song?.duration_sec ?? 0)
    setStatus('loading')
    setPlaying(false)

    audio?.pause()
    const source = sourceFor(song)
    if (!source) {
      setStatus('unavailable')
      return
    }
    if (!audio) return

    audio.src = source
    audio.load()
    audio.play().then(() => {
      if (requestId === requestIdRef.current) {
        setPlaying(true)
        setStatus('ready')
      }
    }).catch((error) => {
      if (requestId !== requestIdRef.current || error?.name === 'AbortError') return
      setPlaying(false)
      setStatus('error')
    })
  }, [])

  const play = useCallback((song, queue = songs) => {
    historyRef.current = []
    queueRef.current = queue.length ? queue : [song]
    startAudio(song ?? current, 0)
  }, [current, songs, startAudio])
  const playQueue = useCallback((queue) => {
    if (!queue.length) return
    historyRef.current = []
    queueRef.current = queue
    startAudio(queue[0], 0)
  }, [startAudio])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (playing) {
      audio?.pause()
      setPlaying(false)
      return
    }
    if (!sourceFor(current)) {
      setStatus('unavailable')
      return
    }
    if (!audio) return
    if (audio.src && audio.src === new URL(sourceFor(current), window.location.href).href && status === 'ready') {
      audio.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false)
        setStatus('error')
      })
      return
    }
    startAudio(current, elapsed)
  }, [current, elapsed, playing, startAudio, status])

  const seek = useCallback((value) => {
    const position = Math.max(0, Math.min(duration, Number(value) || 0))
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = position
    }
    pendingSeekRef.current = position
    setElapsed(position)
  }, [duration])

  const step = useCallback((direction) => {
    const queue = queueRef.current.length ? queueRef.current : songs
    const index = queue.findIndex((song) => song.id === current.id)
    if (direction < 0 && historyRef.current.length) {
      const previousId = historyRef.current.pop()
      const previousSong = queue.find((song) => song.id === previousId)
      if (previousSong) {
        startAudio(previousSong, 0)
        return
      }
    }
    let nextIndex
    if (shuffle && direction > 0 && queue.length > 1) {
      const candidates = queue.filter((song) => song.id !== current.id)
      const nextSong = candidates[Math.floor(Math.random() * candidates.length)]
      historyRef.current.push(current.id)
      startAudio(nextSong, 0)
      return
    }
    nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= queue.length) {
      if (repeat !== 'all') {
        if (direction > 0) {
          audioRef.current?.pause()
          setPlaying(false)
        }
        return
      }
      nextIndex = (nextIndex + queue.length) % queue.length
    }
    if (direction > 0) historyRef.current.push(current.id)
    startAudio(queue[nextIndex], 0)
  }, [current, repeat, shuffle, startAudio])
  stepRef.current = step

  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => {
    if (elapsed > 3) {
      seek(0)
      return
    }
    step(-1)
  }, [elapsed, seek, step])
  const changeVolume = useCallback((value) => {
    const nextVolume = Math.min(1, Math.max(0, Number(value)))
    setVolume(nextVolume)
    if (nextVolume > 0) setMuted(false)
    if (audioRef.current) {
      audioRef.current.volume = nextVolume
      audioRef.current.muted = nextVolume === 0
    }
  }, [])
  const toggleMute = useCallback(() => {
    setMuted((wasMuted) => {
      const nextMuted = !wasMuted
      if (audioRef.current) audioRef.current.muted = nextMuted
      return nextMuted
    })
  }, [])
  const cycleRepeat = useCallback(() => {
    setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off')
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume
    audio.muted = muted
    audioRef.current = audio

    const onTimeUpdate = () => {
      const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
      setElapsed(position)
      try {
        localStorage.setItem('vawes-player', JSON.stringify({
          trackId: currentRef.current.id,
          position,
          volume: audio.volume,
          muted: audio.muted,
        }))
      } catch {
        // Storage can be unavailable in private browsing; playback should continue.
      }
    }
    const onMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
      if (pendingSeekRef.current > 0) {
        audio.currentTime = Math.min(pendingSeekRef.current, Number.isFinite(audio.duration) ? audio.duration : pendingSeekRef.current)
        pendingSeekRef.current = 0
      }
      setStatus('ready')
    }
    const onError = () => {
      setPlaying(false)
      setStatus('error')
    }
    const onEnded = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {
          setPlaying(false)
          setStatus('error')
        })
      } else {
        stepRef.current?.(1)
      }
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onMetadata)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)

    const savedSource = sourceFor(current)
    if (savedSource) {
      audio.src = savedSource
      audio.load()
    }

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = muted
    }
    try {
      localStorage.setItem('vawes-player', JSON.stringify({
        trackId: current.id,
        position: elapsed,
        volume,
        muted,
      }))
    } catch {
      // Storage can be unavailable in private browsing; playback should continue.
    }
  }, [current, elapsed, muted, volume])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      )) return
      if (event.code === 'Space') {
        event.preventDefault()
        toggle()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        seek(elapsed - 5)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        seek(elapsed + 5)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [elapsed, seek, toggle])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const mediaSession = navigator.mediaSession
    if (typeof MediaMetadata !== 'undefined') {
      mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: current.cover_url ? [{ src: current.cover_url, sizes: '512x512', type: 'image/jpeg' }] : [],
      })
    }
    const handlers = {
      play: () => toggle(),
      pause: () => {
        audioRef.current?.pause()
        setPlaying(false)
      },
      previoustrack: () => prev(),
      nexttrack: () => next(),
      seekbackward: (event) => seek(elapsed - (event.seekOffset ?? 10)),
      seekforward: (event) => seek(elapsed + (event.seekOffset ?? 10)),
      seekto: (event) => {
        if (Number.isFinite(event.seekTime)) seek(event.seekTime)
      },
    }
    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        mediaSession.setActionHandler(action, handler)
      } catch {
        // Ignore unsupported Media Session actions.
      }
    })
    if (Number.isFinite(duration) && duration > 0 && typeof mediaSession.setPositionState === 'function') {
      try {
        mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(elapsed, duration) })
      } catch {
        // Some browsers reject position state until metadata is available.
      }
    }
    return () => {
      Object.keys(handlers).forEach((action) => {
        try {
          mediaSession.setActionHandler(action, null)
        } catch {
          // Ignore unsupported Media Session actions.
        }
      })
    }
  }, [current, duration, elapsed, next, prev, seek, toggle])

  const state = useMemo(() => ({
    current, playing, elapsed, duration, volume, muted, status, shuffle, repeat, queue: queueRef.current,
  }), [current, playing, elapsed, duration, volume, muted, status, shuffle, repeat])
  const actions = useMemo(() => ({
    play, playQueue, toggle, seek, next, prev, changeVolume, toggleMute,
    toggleShuffle: () => setShuffle((value) => !value),
    cycleRepeat,
  }), [next, play, playQueue, prev, seek, toggle, changeVolume, toggleMute, cycleRepeat])
  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { songs } from './data.js'

const StateCtx = createContext(null)
const ActionsCtx = createContext(null)
export const usePlayerState = () => useContext(StateCtx)
export const usePlayerActions = () => useContext(ActionsCtx)

export function PlayerProvider({ children }) {
  const [current, setCurrent] = useState(songs[0])
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const play = useCallback((song) => { setCurrent(song); setElapsed(0); setPlaying(true) }, [])
  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const seek = useCallback((value) => {
    const position = Math.max(0, Math.min(current.duration_sec, Number(value)))
    setElapsed(position)
  }, [current.duration_sec])
  const step = useCallback((dir) => {
    const i = songs.findIndex((s) => s.id === current.id)
    play(songs[(i + dir + songs.length) % songs.length])
  }, [current.id, play])
  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => step(-1), [step])

  // Hang még nincs: az idővonal csak szimulálva halad
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (elapsed >= current.duration_sec) step(1)
  }, [current.duration_sec, elapsed, step])

  const state = useMemo(() => ({ current, playing, elapsed }), [current, playing, elapsed])
  const actions = useMemo(() => ({ play, toggle, seek, next, prev }), [next, play, prev, seek, toggle])
  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  )
}

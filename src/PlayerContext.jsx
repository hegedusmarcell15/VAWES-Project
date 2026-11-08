import { createContext, useContext, useEffect, useState } from 'react'
import { songs } from './data.js'

const Ctx = createContext(null)
export const usePlayer = () => useContext(Ctx)

export function PlayerProvider({ children }) {
  const [current, setCurrent] = useState(songs[0])
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const play = (song) => { setCurrent(song); setElapsed(0); setPlaying(true) }
  const toggle = () => setPlaying((p) => !p)
  const seek = (value) => {
    const position = Math.max(0, Math.min(current.duration_sec, Number(value)))
    setElapsed(position)
  }
  const step = (dir) => {
    const i = songs.findIndex((s) => s.id === current.id)
    play(songs[(i + dir + songs.length) % songs.length])
  }

  // Hang még nincs: az idővonal csak szimulálva halad
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [playing])

  useEffect(() => {
    if (elapsed >= current.duration_sec) step(1)
  }, [elapsed]) // eslint-disable-line

  return (
    <Ctx.Provider value={{ current, playing, elapsed, play, toggle, seek, next: () => step(1), prev: () => step(-1) }}>
      {children}
    </Ctx.Provider>
  )
}

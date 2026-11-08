import { useMemo, useRef, useState } from 'react'
import { playlists, songs, fmt, norm } from '../data.js'
import { usePlayer } from '../PlayerContext.jsx'
import Cover from '../components/Cover.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from '../components/Icon.jsx'

function Highlight({ text, term }) {
  const cleanTerm = term.trim()
  const i = cleanTerm ? text.toLocaleLowerCase().indexOf(cleanTerm.toLocaleLowerCase()) : -1
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + cleanTerm.length)}</mark>{text.slice(i + cleanTerm.length)}</>
}

export default function Search() {
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const searchInputRef = useRef(null)
  const { current, play } = usePlayer()
  const { t, playlistName } = useLanguage()
  const term = q.trim()
  const active = term !== '' || chip !== 'all'

  const normalizedQuery = norm(term)
  const results = useMemo(() => songs
    .filter((s) => {
      if (chip !== 'all' && s.playlist !== chip) return false
      if (!normalizedQuery) return true
      const fields = [norm(s.title), norm(s.artist), norm(s.album)]
      if (fields.some((field) => field.includes(normalizedQuery))) return true
      const queryTokens = normalizedQuery.split(' ').filter(Boolean)
      return queryTokens.every((token) => fields.some((field) => field.split(' ').some((word) =>
        word === token || (token.length >= 3 && word.startsWith(token)))))
    })
    .sort((a, b) => {
      const aExact = norm(`${a.title} ${a.artist}`) === normalizedQuery
      const bExact = norm(`${b.title} ${b.artist}`) === normalizedQuery
      return Number(bExact) - Number(aExact)
    }), [chip, normalizedQuery])
  const chips = [{ id: 'all', name: t('all') }, ...playlists.slice(0, 4).map((p) => ({ ...p, name: playlistName(p.id) }))]

  return (
    <>
      <div className={`search-box ${term ? 'has-text' : ''}`}>
        <button className="ico" type="button" aria-label={t('search')} onClick={() => searchInputRef.current?.focus()}><Icon name="search" size={18} /></button>
        <input ref={searchInputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
               placeholder={t('searchPlaceholder')} aria-label={t('search')} />
        {term && <button className="clear" aria-label={t('clear')} onClick={() => setQ('')}><Icon name="close" size={15} /></button>}
      </div>

      <div className="chips">
        {chips.map((c) => (
          <button key={c.id} className={`chip ${chip === c.id ? 'on' : ''}`} onClick={() => setChip(c.id)}>{c.name}</button>
        ))}
      </div>

      {!active ? (
        <section>
          <h2>{t('browse')}</h2>
          <div className="tiles">
            {playlists.slice(0, 4).map((p) => (
              <button key={p.id} className="tile" style={{ '--c': `var(--${p.color})` }} onClick={() => setChip(p.id)}>{playlistName(p.id)}</button>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2>{t('results')}</h2>
          {results.length === 0 ? (
            <p className="empty">{t('noResults')} <b>{term}</b>. {t('tryAgain')}</p>
          ) : (
            <table>
              <thead><tr><th>{t('title')}</th><th className="col-album">{t('album')}</th><th>{t('duration')}</th></tr></thead>
              <tbody>
                {results.map((s) => {
                  const pl = playlists.find((p) => p.id === s.playlist)
                  return (
                    <tr key={s.id} className={`row ${current.id === s.id ? 'playing' : ''}`} onClick={() => play(s)}>
                      <td><div className="t-cell"><Cover color={pl.color} size="sm" image={s.cover_url} /><span className="t"><Highlight text={s.title} term={term} /><small className="result-artist">{s.artist}</small></span></div></td>
                      <td className="col-album"><Highlight text={s.album} term={term} /></td>
                      <td>{fmt(s.duration_sec)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  )
}

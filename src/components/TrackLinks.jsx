import { Link } from 'react-router-dom'

export function ArtistLink({ id, children }) {
  if (!id) return children
  return <Link className="entity-link" to={`/eloado/${encodeURIComponent(id)}`} onClick={(event) => event.stopPropagation()}>{children}</Link>
}

export function AlbumLink({ id, children }) {
  if (!id) return children
  return <Link className="entity-link" to={`/album/${encodeURIComponent(id)}`} onClick={(event) => event.stopPropagation()}>{children}</Link>
}

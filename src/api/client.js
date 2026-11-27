export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const emptyCatalog = { artists: [], albums: [], songs: [], playlists: [] }
const pageSize = 100

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiGet(path, options = {}) {
  if (!apiBaseUrl) throw new ApiError('VITE_API_BASE_URL is not configured')

  let response
  try {
    response = await fetch(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`, {
      ...options,
      credentials: 'include',
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('Could not connect to the VAWES API. Check the connection and try again.')
  }
  if (!response.ok) {
    throw new ApiError(await responseMessage(response), response.status)
  }
  if (response.status === 204) return null
  return response.json()
}

async function responseMessage(response) {
  const body = await response.text()
  if (!body) return `API request failed with status ${response.status}`
  try {
    const problem = JSON.parse(body)
    return problem.title ?? problem.detail ?? problem.message ?? body
  } catch {
    return body
  }
}

export async function apiList(resource, { search = '', page = 1, size = pageSize, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(size) })
  if (search.trim()) params.set('search', search.trim())
  return apiGet(`${resource}?${params}`, { signal })
}

export async function uploadSong({ file, title, artist, album, genre, onProgress }) {
  if (!apiBaseUrl) throw new ApiError('VITE_API_BASE_URL is not configured')

  const form = new FormData()
  form.append('file', file)
  for (const [name, value] of Object.entries({ title, artist, album, genre })) {
    if (value?.trim()) form.append(name, value.trim())
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${apiBaseUrl}/songs`)
    request.withCredentials = true
    request.timeout = 120000
    request.setRequestHeader('Accept', 'application/json')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError('The upload request could not reach the API.'))
    request.onabort = () => reject(new ApiError('The upload was cancelled.'))
    request.ontimeout = () => reject(new ApiError('The upload timed out. Check your connection and retry.'))
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        let message = request.responseText || `API request failed with status ${request.status}`
        try {
          const problem = JSON.parse(request.responseText)
          message = problem.title ?? problem.detail ?? problem.message ?? message
        } catch {
          // Keep the response body for non-JSON API errors.
        }
        reject(new ApiError(message, request.status))
        return
      }
      try {
        resolve(JSON.parse(request.responseText))
      } catch {
        reject(new ApiError('The API returned an invalid upload response.', request.status))
      }
    }
    request.send(form)
  })
}

export async function updateSong(id, changes) {
  return apiGet(`songs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })
}

export async function deleteSong(id) {
  return apiGet(`songs/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function streamUrl(id) {
  if (!apiBaseUrl || id == null) return ''
  return `${apiBaseUrl}/songs/${encodeURIComponent(id)}/stream`
}

export function audioUrlForSong(song) {
  const source = song?.audio_url ?? song?.audio_file ?? song?.file_path ?? ''
  if (!source) return ''
  if (/^(https?:|blob:|data:)/i.test(source)) return source
  if (source.startsWith('/') || source.startsWith('audio/')) {
    return `${import.meta.env.BASE_URL}${source.replace(/^\/+/, '')}`
  }
  return streamUrl(song.id)
}

async function getAll(resource, signal) {
  const items = []
  let page = 1
  let total = 0
  do {
    const result = await apiList(resource, { page, size: pageSize, signal })
    if (!Array.isArray(result.items) || !Number.isFinite(result.total)) {
      throw new ApiError(`Invalid paginated response from ${resource}`)
    }
    items.push(...result.items)
    total = result.total
    page += 1
  } while (items.length < total)
  return items
}

export async function loadCatalog(signal) {
  if (!apiBaseUrl) {
    return {
      catalog: emptyCatalog,
      source: 'empty',
      error: new ApiError('VITE_API_BASE_URL is not configured'),
    }
  }

  try {
    const [artists, albums, songs, playlists] = await Promise.all([
      getAll('artists', signal),
      getAll('albums', signal),
      getAll('songs', signal),
      getAll('playlists', signal),
    ])
    // A track without an audio source is a database record, not playable music.
    // Keep it out of the catalog so deleted or placeholder entries cannot resurface.
    const playableSongs = songs.filter((song) => Boolean(audioUrlForSong(song)))
    const artistIds = new Set(playableSongs.map((song) => String(song.artist_id ?? '')))
    const albumIds = new Set(playableSongs.map((song) => String(song.album_id ?? '')))
    const catalog = {
      artists: artists.filter((artist) => artistIds.has(String(artist.id))),
      albums: albums.filter((album) => albumIds.has(String(album.id))),
      songs: playableSongs,
      playlists,
    }
    return { catalog, source: 'api', error: null }
  } catch (error) {
    if (signal?.aborted) throw error
    return { catalog: emptyCatalog, source: 'empty', error }
  }
}

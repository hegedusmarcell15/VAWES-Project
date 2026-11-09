import { Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './PlayerContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Search from './pages/Search.jsx'
import Library from './pages/Library.jsx'
import Artist from './pages/Artist.jsx'
import Album from './pages/Album.jsx'
import Playlist from './pages/Playlist.jsx'
import Favorites from './pages/Favorites.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import { CatalogProvider } from './CatalogContext.jsx'

export default function App() {
  return (
    <CatalogProvider>
      <LanguageProvider>
        <PlayerProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="lista/:id" element={<Playlist />} />
              <Route path="kereses" element={<Search />} />
              <Route path="konyvtar" element={<Library />} />
              <Route path="kedvencek" element={<Favorites />} />
              <Route path="eloado/:id" element={<Artist />} />
              <Route path="album/:id" element={<Album />} />
            </Route>
          </Routes>
        </PlayerProvider>
      </LanguageProvider>
    </CatalogProvider>
  )
}

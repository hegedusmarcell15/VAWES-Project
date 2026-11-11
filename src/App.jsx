import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
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
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './AuthContext.jsx'
import AuthPage from './pages/AuthPage.jsx'

function RequireAuth() {
  const { user, status } = useAuth()

  if (status === 'loading') return <main className="auth-page" aria-busy="true" />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <LanguageProvider>
          <PlayerProvider>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="lista/:id" element={<Playlist />} />
                  <Route path="kereses" element={<Search />} />
                  <Route path="konyvtar" element={<Library />} />
                  <Route path="kedvencek" element={<Favorites />} />
                  <Route path="eloado/:id" element={<Artist />} />
                  <Route path="album/:id" element={<Album />} />
                </Route>
              </Route>
            </Routes>
          </PlayerProvider>
        </LanguageProvider>
      </CatalogProvider>
    </AuthProvider>
  )
}

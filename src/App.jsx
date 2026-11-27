import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PlayerProvider } from './PlayerContext.jsx'
import Layout from './components/Layout.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import { CatalogProvider } from './CatalogContext.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { isAllowedAdmin } from './adminAccess.js'

const Home = lazy(() => import('./pages/Home.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const Library = lazy(() => import('./pages/Library.jsx'))
const Artist = lazy(() => import('./pages/Artist.jsx'))
const Album = lazy(() => import('./pages/Album.jsx'))
const Playlist = lazy(() => import('./pages/Playlist.jsx'))
const Favorites = lazy(() => import('./pages/Favorites.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))

function RouteFallback() {
  return <main className="auth-page" aria-busy="true" />
}

function RequireAuth() {
  const { user, status } = useAuth()

  if (status === 'loading') return <RouteFallback />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user, status } = useAuth()

  if (status === 'loading') return <RouteFallback />
  if (!user) return <Navigate to="/admin/login" replace />
  if (!isAllowedAdmin(user)) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CatalogProvider>
          <LanguageProvider>
            <PlayerProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/register" element={<AuthPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
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
              </Suspense>
            </PlayerProvider>
          </LanguageProvider>
        </CatalogProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

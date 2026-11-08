import { Routes, Route } from 'react-router-dom'
import { PlayerProvider } from './PlayerContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Search from './pages/Search.jsx'
import Library from './pages/Library.jsx'
import { LanguageProvider } from './LanguageContext.jsx'

export default function App() {
  return (
    <LanguageProvider>
      <PlayerProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lista/:id" element={<Home />} />
          <Route path="kereses" element={<Search />} />
          <Route path="konyvtar" element={<Library />} />
        </Route>
      </Routes>
      </PlayerProvider>
    </LanguageProvider>
  )
}

import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import Cover from './Cover.jsx'
import Player from './Player.jsx'
import { sidebarPlaylists } from '../data.js'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'

export default function Layout() {
  const { language, setLanguage, t, playlistName } = useLanguage()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [avatar, setAvatar] = useState(() => localStorage.getItem('vawes-avatar') ?? '')
  const [avatarError, setAvatarError] = useState('')
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('vawes-wallpaper') ?? '')
  const [wallpaperError, setWallpaperError] = useState('')
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('vawes-theme') ?? 'aurora')
  const [playStyle, setPlayStyle] = useState(() => localStorage.getItem('vawes-play-style') ?? 'prism')
  const defaultCustomTheme = { label: 'Custom', background: '#0b0a1a', violet: '#7c5cff', cyan: '#2dd4ff', pink: '#ff4fd8' }
  const [customTheme, setCustomTheme] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vawes-custom-theme'))
      const valid = saved && ['background', 'violet', 'cyan', 'pink'].every((key) => /^#[0-9a-f]{6}$/i.test(saved[key]))
      return valid ? { ...defaultCustomTheme, ...saved } : defaultCustomTheme
    } catch {
      return defaultCustomTheme
    }
  })
  const languageRef = useRef(null)
  const profileRef = useRef(null)
  const languages = [['hu', 'Magyar'], ['en', 'English'], ['zh', '中文']]
  const themes = {
    aurora: { label: 'Aurora', background: '#0b0a1a', violet: '#7c5cff', cyan: '#2dd4ff', pink: '#ff4fd8' },
    ocean: { label: 'Deep ocean', background: '#06141d', violet: '#4169e1', cyan: '#20d5c2', pink: '#5d8dff' },
    sunset: { label: 'Sunset glow', background: '#1b0c1a', violet: '#b04dff', cyan: '#ff9b54', pink: '#ff4f9a' },
    graphite: { label: 'Graphite', background: '#101217', violet: '#737bff', cyan: '#a3b8c8', pink: '#c084fc' },
  }
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setAvatarError(t('avatarTypeError'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('avatarSizeError'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setAvatarError(t('avatarReadError'))
        return
      }
      const image = new Image()
      image.onload = () => {
        const size = 512
        const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          setAvatarError(t('avatarReadError'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const optimized = canvas.toDataURL('image/jpeg', .82)
        setAvatar(optimized)
        localStorage.setItem('vawes-avatar', optimized)
        window.dispatchEvent(new CustomEvent('vawes-avatar-change', { detail: optimized }))
        setAvatarError('')
      }
      image.onerror = () => setAvatarError(t('avatarReadError'))
      image.src = reader.result
    }
    reader.onerror = () => setAvatarError(t('avatarReadError'))
    reader.readAsDataURL(file)
  }
  const removeAvatar = () => {
    setAvatar('')
    localStorage.removeItem('vawes-avatar')
    window.dispatchEvent(new CustomEvent('vawes-avatar-change', { detail: '' }))
    setAvatarError('')
  }
  const handleWallpaperChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setWallpaperError(t('wallpaperTypeError'))
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setWallpaperError(t('wallpaperSizeError'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setWallpaperError(t('wallpaperReadError'))
        return
      }
      const image = new Image()
      image.onload = () => {
        const size = 1920
        const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          setWallpaperError(t('wallpaperReadError'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const optimized = canvas.toDataURL('image/jpeg', .78)
        try {
          localStorage.setItem('vawes-wallpaper', optimized)
          setWallpaper(optimized)
          setWallpaperError('')
        } catch {
          setWallpaperError(t('wallpaperStorageError'))
        }
      }
      image.onerror = () => setWallpaperError(t('wallpaperReadError'))
      image.src = reader.result
    }
    reader.onerror = () => setWallpaperError(t('wallpaperReadError'))
    reader.readAsDataURL(file)
  }
  const removeWallpaper = () => {
    setWallpaper('')
    localStorage.removeItem('vawes-wallpaper')
    setWallpaperError('')
  }

  useEffect(() => {
    const selected = theme === 'custom' ? customTheme : themes[theme] ?? themes.aurora
    const root = document.documentElement
    root.style.setProperty('--app-bg', selected.background)
    root.style.setProperty('--violet', selected.violet)
    root.style.setProperty('--cyan', selected.cyan)
    root.style.setProperty('--pink', selected.pink)
    root.style.setProperty('--wallpaper-image', wallpaper ? `url("${wallpaper}")` : 'none')
    root.style.setProperty('--wallpaper-opacity', wallpaper ? '.72' : '0')
    localStorage.setItem('vawes-theme', theme)
    localStorage.setItem('vawes-custom-theme', JSON.stringify(customTheme))
  }, [theme, customTheme, wallpaper])

  const updateCustomColor = (key, value) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return
    setCustomTheme((current) => ({ ...current, [key]: value }))
    setTheme('custom')
  }
  const choosePlayStyle = (next) => {
    setPlayStyle(next)
    localStorage.setItem('vawes-play-style', next)
    window.dispatchEvent(new CustomEvent('vawes-play-style-change', { detail: next }))
  }

  useEffect(() => {
    const closeLanguageMenu = (event) => {
      if (!languageRef.current?.contains(event.target)) setLanguageOpen(false)
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    document.addEventListener('pointerdown', closeLanguageMenu)
    const closeAppearance = (event) => {
      if (event.key === 'Escape') {
        setLanguageOpen(false)
        setProfileOpen(false)
        setAppearanceOpen(false)
      }
    }
    document.addEventListener('keydown', closeAppearance)
    return () => {
      document.removeEventListener('pointerdown', closeLanguageMenu)
      document.removeEventListener('keydown', closeAppearance)
    }
  }, [])

  return (
    <div className="app">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="main">
        <aside className="sidebar glass">
          <div className="brand">VAWES</div>
          <nav>
            <NavLink to="/" end>{t('home')}</NavLink>
            <NavLink to="/kereses">{t('search')}</NavLink>
            <NavLink to="/konyvtar">{t('library')}</NavLink>
          </nav>
          <p className="label">{t('playlists')}</p>
          {sidebarPlaylists.map((p) => (
            <Link key={p.id} className="pl-item" to={`/lista/${p.id}`}>
              <Cover color={p.color} size="xs" />{playlistName(p.id)}
            </Link>
          ))}
          <div className={`language-picker ${languageOpen ? 'open' : ''}`} ref={languageRef}>
            <span className="language-label"><span className="language-icon"><Icon name="globe" size={15} /></span>{t('language')}</span>
            <div className="language-select">
              <button
                className="language-trigger"
                type="button"
                aria-expanded={languageOpen}
                aria-haspopup="listbox"
                aria-label={t('language')}
                onClick={() => setLanguageOpen((open) => !open)}
              >
                {languages.find(([code]) => code === language)?.[1]}
              </button>
              {languageOpen && (
                <div className="language-menu" role="listbox" aria-label={t('language')}>
                  {languages.map(([code, name]) => (
                    <button
                      key={code}
                      className={`language-option ${language === code ? 'selected' : ''}`}
                      type="button"
                      role="option"
                      aria-selected={language === code}
                      onClick={() => {
                        setLanguage(code)
                        setLanguageOpen(false)
                      }}
                    >
                      <span>{name}</span>
                      {language === code && <span className="language-check" aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`profile-area ${profileOpen ? 'open' : ''}`} ref={profileRef}>
            {profileOpen && (
              <div className="profile-menu" role="menu" aria-label={t('accountSettings')}>
                <div className="profile-summary">
                  <span className="profile-avatar">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={18} />}</span>
                  <span><strong>User</strong><small>{t('accountReady')}</small></span>
                </div>
                <p className="profile-description">{t('accountDescription')}</p>
                {[
                  ['user', 'profile'],
                  ['settings', 'preferences'],
                  ['settings', 'playback'],
                  ['settings', 'privacy'],
                  ['user', 'help'],
                ].map(([icon, label]) => (
                  <button key={label} type="button" className="profile-option" role="menuitem" onClick={() => {
                    setProfileOpen(false)
                    if (label === 'preferences') setAppearanceOpen(true)
                    if (label === 'profile') {
                      setAvatarError('')
                      setProfileSettingsOpen(true)
                    }
                  }}>
                    <Icon name={icon} size={15} /><span>{t(label)}</span>
                  </button>
                ))}
                <button type="button" className="profile-option profile-signout" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <Icon name="user" size={15} /><span>{t('signOut')}</span>
                </button>
              </div>
            )}
            <button
              className="profile-trigger"
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label={t('account')}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="profile-avatar">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={17} />}</span>
              <span className="profile-trigger-copy"><strong>User</strong><small>{t('account')}</small></span>
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </aside>
        <main className="content glass">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-nav glass" aria-label={t('navigation')}>
        <NavLink to="/" end><Icon name="home" size={18} /><span>{t('home')}</span></NavLink>
        <NavLink to="/kereses"><Icon name="search" size={18} /><span>{t('search')}</span></NavLink>
        <NavLink to="/konyvtar"><Icon name="library" size={18} /><span>{t('library')}</span></NavLink>
      </nav>
      <Player />
      {appearanceOpen && (
        <div className="appearance-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAppearanceOpen(false)
        }}>
          <section className="appearance-modal glass" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
            <div className="appearance-heading">
              <div><p className="eyebrow">{t('preferences')}</p><h2 id="appearance-title">{t('appearance')}</h2></div>
              <button className="appearance-close" type="button" aria-label={t('close')} onClick={() => setAppearanceOpen(false)}><Icon name="close" size={17} /></button>
            </div>
            <p className="appearance-copy">{t('appearanceDescription')}</p>
            <div className="theme-grid">
              {Object.entries(themes).map(([id, option]) => (
                <button
                  key={id}
                  type="button"
                  className={`theme-option ${theme === id ? 'selected' : ''}`}
                  onClick={() => setTheme(id)}
                >
                  <span className="theme-preview" style={{ '--theme-bg': option.background, '--theme-violet': option.violet, '--theme-cyan': option.cyan, '--theme-pink': option.pink }} />
                  <span>{option.label}</span>
                  {theme === id && <span className="theme-check">✓</span>}
                </button>
              ))}
              <button
                type="button"
                className={`theme-option ${theme === 'custom' ? 'selected' : ''}`}
                onClick={() => setTheme('custom')}
              >
                <span className="theme-preview" style={{ '--theme-bg': customTheme.background, '--theme-violet': customTheme.violet, '--theme-cyan': customTheme.cyan, '--theme-pink': customTheme.pink }} />
                <span>{t('customTheme')}</span>
                {theme === 'custom' && <span className="theme-check">✓</span>}
              </button>
            </div>
            <div className="custom-colors">
              <p className="appearance-label">{t('customColors')}</p>
              {[
                ['background', t('backgroundColor')],
                ['violet', t('violetColor')],
                ['cyan', t('cyanColor')],
                ['pink', t('pinkColor')],
              ].map(([key, label]) => (
                <label key={key} className="color-control">
                  <span>{label}</span>
                  <span className="color-value"><input type="color" value={customTheme[key]} onChange={(event) => updateCustomColor(key, event.target.value)} /><code>{customTheme[key]}</code></span>
                </label>
              ))}
            </div>
            <div className="wallpaper-section">
              <p className="appearance-label">{t('wallpaper')}</p>
              <label className="upload-button wallpaper-upload">
                <Icon name="image" size={15} />{t('chooseWallpaper')}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleWallpaperChange} />
              </label>
              {wallpaper && <button className="remove-photo" type="button" onClick={removeWallpaper}>{t('removeWallpaper')}</button>}
              {wallpaperError && <p className="avatar-error" role="alert">{wallpaperError}</p>}
              <p className="appearance-copy profile-file-hint">{t('wallpaperHint')}</p>
            </div>
            <div className="play-style-section">
              <p className="appearance-label">{t('playButtonStyle')}</p>
              <div className="play-style-grid">
                {[
                  ['prism', t('stylePrism')],
                  ['halo', t('styleHalo')],
                  ['solid', t('styleSolid')],
                  ['minimal', t('styleMinimal')],
                ].map(([id, label]) => (
                  <button key={id} type="button" className={`play-style-option ${playStyle === id ? 'selected' : ''}`} onClick={() => choosePlayStyle(id)}>
                    <span className={`style-swatch play-style-${id}`}><Icon name="play" size={11} /></span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="appearance-row"><span><strong>{t('glassIntensity')}</strong><small>{t('glassIntensityDescription')}</small></span><span className="appearance-badge">{t('active')}</span></div>
          </section>
        </div>
      )}
      {profileSettingsOpen && (
        <div className="appearance-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProfileSettingsOpen(false)
        }}>
          <section className="appearance-modal profile-settings-modal glass" role="dialog" aria-modal="true" aria-labelledby="profile-settings-title">
            <div className="appearance-heading">
              <div><p className="eyebrow">{t('account')}</p><h2 id="profile-settings-title">{t('profileSettings')}</h2></div>
              <button className="appearance-close" type="button" aria-label={t('close')} onClick={() => setProfileSettingsOpen(false)}><Icon name="close" size={17} /></button>
            </div>
            <div className="profile-editor">
              <span className="profile-avatar profile-avatar-large">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={30} />}</span>
              <div><strong>User</strong><small>{t('profilePhotoDescription')}</small></div>
            </div>
            <label className="upload-button">
              <Icon name="user" size={15} />{t('choosePhoto')}
              <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarChange} />
            </label>
            {avatar && <button className="remove-photo" type="button" onClick={removeAvatar}>{t('removePhoto')}</button>}
            {avatarError && <p className="avatar-error" role="alert">{avatarError}</p>}
            <p className="appearance-copy profile-file-hint">{t('profilePhotoHint')}</p>
          </section>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import Cover from './Cover.jsx'
import Player from './Player.jsx'
import { useCatalog } from '../CatalogContext.jsx'
import { useLanguage } from '../LanguageContext.jsx'
import Icon from './Icon.jsx'
import { useAuth } from '../AuthContext.jsx'
import { isAllowedAdmin } from '../adminAccess.js'
import { useTheme } from '../ThemeContext.jsx'
import { usePlayerActions, usePlayerState } from '../PlayerContext.jsx'

const SLEEP_OPTIONS = [0, 15, 30, 60]
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5]

function fmtSleep(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function Layout() {
  const { catalog, status, error } = useCatalog()
  const { user, logout } = useAuth()
  const { language, setLanguage, t, playlistName } = useLanguage()
  const { theme, setTheme, customTheme, updateCustomColor, themes } = useTheme()
  const { speed, sleepMinutes, sleepRemaining } = usePlayerState()
  const { setSpeed, setSleepTimer } = usePlayerActions()
  const navigate = useNavigate()
  const [languageOpen, setLanguageOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [avatar, setAvatar] = useState(() => localStorage.getItem('vawes-avatar') ?? '')
  const [avatarError, setAvatarError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [playStyle, setPlayStyle] = useState(() => localStorage.getItem('vawes-play-style') ?? 'prism')
  const languageRef = useRef(null)
  const profileRef = useRef(null)
  const languages = [['hu', 'Magyar'], ['en', 'English'], ['zh', '中文']]
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
  const handleSignOut = async () => {
    setProfileError('')
    try {
      await logout()
      setProfileOpen(false)
    } catch (signOutError) {
      setProfileError(signOutError.message)
    }
  }

  useEffect(() => {
    const openShortcuts = () => setShortcutsOpen(true)
    const focusSearch = () => {
      navigate('/kereses')
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('vawes-focus-search-input')), 120)
    }
    window.addEventListener('vawes-shortcuts', openShortcuts)
    window.addEventListener('vawes-focus-search', focusSearch)
    return () => {
      window.removeEventListener('vawes-shortcuts', openShortcuts)
      window.removeEventListener('vawes-focus-search', focusSearch)
    }
  }, [navigate])

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
        setShortcutsOpen(false)
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
            <NavLink to="/kedvencek">{t('favorites')}</NavLink>
            {user && isAllowedAdmin(user) && <NavLink to="/admin">{t('adminPortalLink')}</NavLink>}
          </nav>
          <p className="label">{t('playlists')}</p>
          {catalog.playlists.slice(0, 4).map((p) => (
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
                      {language === code && <span className="language-check" aria-hidden="true"><Icon name="check" size={14} /></span>}
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
                  <span><strong>{user?.username ?? t('account')}</strong><small>{user ? t('account') : t('authWelcome')}</small></span>
                </div>
                {user ? (
                  <>
                    {[
                      ['user', 'profile'],
                      ['settings', 'preferences'],
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
                    <button type="button" className="profile-option profile-signout" role="menuitem" onClick={handleSignOut}>
                      <Icon name="logout" size={15} /><span>{t('signOut')}</span>
                    </button>
                  </>
                ) : (
                  <div className="profile-auth-actions">
                    <Link to="/login" className="profile-option" role="menuitem" onClick={() => setProfileOpen(false)}>{t('authLogin')}</Link>
                    <Link to="/register" className="profile-option" role="menuitem" onClick={() => setProfileOpen(false)}>{t('authRegister')}</Link>
                  </div>
                )}
                {profileError && <p className="avatar-error" role="alert">{profileError}</p>}
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
              <span className="profile-trigger-copy"><strong>{user?.username ?? t('account')}</strong><small>{user ? t('account') : t('authLogin')}</small></span>
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </aside>
        <main className="content glass">
          {status === 'ready' && error && <p className="catalog-offline" role="status">{t('catalogOffline')}</p>}
          <Outlet />
        </main>
      </div>
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
                  <span className="theme-preview" style={{ '--theme-bg': option.background, '--theme-violet': option.palette.violet, '--theme-cyan': option.palette.cyan, '--theme-pink': option.palette.pink }} />
                  <span>{t(option.labelKey)}</span>
                  {theme === id && <span className="theme-check"><Icon name="check" size={14} /></span>}
                </button>
              ))}
              <button
                type="button"
                className={`theme-option ${theme === 'custom' ? 'selected' : ''}`}
                onClick={() => setTheme('custom')}
              >
                <span className="theme-preview" style={{ '--theme-bg': customTheme.background, '--theme-violet': customTheme.violet, '--theme-cyan': customTheme.cyan, '--theme-pink': customTheme.pink }} />
                <span>{t('customTheme')}</span>
                {theme === 'custom' && <span className="theme-check"><Icon name="check" size={14} /></span>}
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
            <div className="playback-settings">
              <p className="appearance-label">{t('playbackSpeed')}</p>
              <div className="speed-grid">
                {SPEED_OPTIONS.map((option) => (
                  <button key={option} type="button" className={`speed-option ${speed === option ? 'selected' : ''}`} onClick={() => setSpeed(option)}>{option}×</button>
                ))}
              </div>
              <p className="appearance-label sleep-label">{t('sleepTimer')}</p>
              <div className="speed-grid">
                {SLEEP_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`speed-option ${(minutes === 0 ? !sleepMinutes : sleepMinutes === minutes) ? 'selected' : ''}`}
                    onClick={() => setSleepTimer(minutes)}
                  >
                    {minutes === 0 ? t('off') : `${minutes} ${t('minutesShort')}`}
                  </button>
                ))}
              </div>
              {sleepRemaining > 0 && <p className="sleep-remaining" role="status">{t('sleepEndsIn')} {fmtSleep(sleepRemaining)}</p>}
            </div>
            <button type="button" className="appearance-link" onClick={() => { setAppearanceOpen(false); setShortcutsOpen(true) }}>
              <Icon name="queue" size={15} /><span>{t('keyboardShortcuts')}</span>
            </button>
            <div className="appearance-row"><span><strong>{t('glassIntensity')}</strong><small>{t('glassIntensityDescription')}</small></span><span className="appearance-badge">{t('active')}</span></div>
          </section>
        </div>
      )}
      {shortcutsOpen && (
        <div className="appearance-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShortcutsOpen(false)
        }}>
          <section className="appearance-modal shortcuts-modal glass" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
            <div className="appearance-heading">
              <div><p className="eyebrow">{t('preferences')}</p><h2 id="shortcuts-title">{t('keyboardShortcuts')}</h2></div>
              <button className="appearance-close" type="button" aria-label={t('close')} onClick={() => setShortcutsOpen(false)}><Icon name="close" size={17} /></button>
            </div>
            <p className="appearance-copy">{t('shortcutsDescription')}</p>
            <div className="shortcut-list">
              {[
                [['Space'], t('shortcutPlayPause')],
                [['←', '→'], t('shortcutSeek')],
                [['M'], t('shortcutMute')],
                [['S'], t('shortcutShuffle')],
                [['R'], t('shortcutRepeat')],
                [['/'], t('shortcutSearch')],
                [['?'], t('shortcutHelp')],
              ].map(([keys, label]) => (
                <div className="shortcut-row" key={label}>
                  <span>{label}</span>
                  <span className="shortcut-keys">{keys.map((key) => <kbd key={key}>{key}</kbd>)}</span>
                </div>
              ))}
            </div>
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
            <p className="appearance-copy">{t('accountDescription')}</p>
            <div className="profile-editor">
              <span className="profile-avatar profile-avatar-large">{avatar ? <img src={avatar} alt="" /> : <Icon name="user" size={30} />}</span>
              <div><strong>{user?.username}</strong><small>{t('profilePhotoDescription')}</small></div>
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

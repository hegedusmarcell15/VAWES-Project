import { createContext, useContext, useMemo, useState } from 'react'
import { playlists } from './data.js'

const translations = {
  hu: {
    home: 'Főoldal', search: 'Keresés', library: 'Könyvtár', playlists: 'Lejátszási listák',
    all: 'Mind', mine: 'Saját', vawesMix: 'VAWES válogatás', searchPlaceholder: 'Szám, album vagy lista keresése',
    clear: 'Törlés', browse: 'Böngészés lista szerint', results: 'Találatok', title: 'Cím', album: 'Album',
    duration: 'Hossz', noResults: 'Nincs találat erre:', tryAgain: 'Próbálj másik keresőszót.',
    libraryCount: (count) => `${count} mentett lejátszási lista`, recent: 'Legutóbb hallgatott',
    byName: 'Név szerint', byLength: 'Hossz szerint', librarySearch: 'Keresés a listák között',
    noLibrary: 'Nincs találat. Próbálj másik keresőszót, vagy válaszd a Mind szűrőt.',
    playlist: 'Lejátszási lista', tracks: (count, minutes) => `${count} szám, ${minutes} perc`,
    discovery: 'VAWES / Felfedezés', fresh: 'A hangulatod. A zenéd.', forYou: 'neked.',
    welcome: 'Új hangok, könnyű ritmusok és válogatott pillanatok a következő lejátszásodhoz.',
    latest: 'Most érkezett', releases: 'Friss megjelenések', allTracks: 'Összes szám',
    curated: 'Neked válogatva', moods: 'Hangulatok', playerLibrary: 'Könyvtár',
    morning: 'Jó reggelt', afternoon: 'Jó napot', evening: 'Jó estét', night: 'Jó éjszakát',
    previous: 'Előző', play: 'Lejátszás', pause: 'Szünet', next: 'Következő',
    language: 'Nyelv', wallpaper: 'Egyéni háttérkép', chooseWallpaper: 'Háttérkép feltöltése', removeWallpaper: 'Háttérkép eltávolítása', wallpaperHint: 'PNG, JPG vagy WEBP, legfeljebb 8 MB.', wallpaperTypeError: 'Csak PNG, JPG vagy WEBP kép tölthető fel.', wallpaperSizeError: 'A háttérkép mérete legfeljebb 8 MB lehet.', wallpaperReadError: 'A háttérkép betöltése nem sikerült.', wallpaperStorageError: 'A háttérkép mentése nem sikerült. Próbálj kisebb képet.',
    account: 'Fiók', accountSettings: 'Fiókbeállítások', profile: 'Profil', preferences: 'Beállítások',
    playback: 'Lejátszás', privacy: 'Adatvédelem', help: 'Súgó és támogatás', signOut: 'Kijelentkezés',
    accountReady: 'Helyi profil', accountDescription: 'A fiókkezelés hamarosan elérhető.', profileSettings: 'Profilbeállítások', profilePhotoDescription: 'A profilképed itt jelenik meg az alkalmazásban.', choosePhoto: 'Kép feltöltése', removePhoto: 'Kép eltávolítása', profilePhotoHint: 'PNG vagy JPG, legfeljebb 5 MB.', avatarTypeError: 'Csak PNG vagy JPG kép tölthető fel.', avatarSizeError: 'A kép mérete legfeljebb 5 MB lehet.', avatarReadError: 'A kép betöltése nem sikerült.', appearance: 'Megjelenés', appearanceDescription: 'Válassz egy színvilágot az alkalmazás üvegfelületéhez.', customTheme: 'Saját téma', customColors: 'Saját színek', backgroundColor: 'Háttér', violetColor: 'Lila kiemelés', cyanColor: 'Cián kiemelés', pinkColor: 'Rózsaszín kiemelés', playButtonStyle: 'Lejátszógomb stílusa', stylePrism: 'Prizma', styleHalo: 'Glória', styleSolid: 'Fényes', styleMinimal: 'Minimalista', glassIntensity: 'Üvegfelület', glassIntensityDescription: 'Aktív liquid-glass stílus', active: 'Aktív', close: 'Bezárás',
  },
  en: {
    home: 'Home', search: 'Search', library: 'Library', playlists: 'Playlists',
    all: 'All', mine: 'Mine', vawesMix: 'VAWES selection', searchPlaceholder: 'Search tracks, albums or playlists',
    clear: 'Clear', browse: 'Browse by playlist', results: 'Results', title: 'Title', album: 'Album',
    duration: 'Length', noResults: 'No results for:', tryAgain: 'Try another search term.',
    libraryCount: (count) => `${count} saved playlists`, recent: 'Recently played',
    byName: 'By name', byLength: 'By length', librarySearch: 'Search playlists',
    noLibrary: 'No results. Try another search term, or choose All.',
    playlist: 'Playlist', tracks: (count, minutes) => `${count} tracks, ${minutes} min`,
    discovery: 'VAWES / Discover', fresh: 'Your mood. Your music.', forYou: 'for you.',
    welcome: 'New sounds, easy rhythms and handpicked moments for your next play.',
    latest: 'Just in', releases: 'New releases', allTracks: 'All tracks',
    curated: 'Curated for you', moods: 'Moods', playerLibrary: 'Library',
    morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good night',
    previous: 'Previous', play: 'Play', pause: 'Pause', next: 'Next',
    language: 'Language', wallpaper: 'Custom wallpaper', chooseWallpaper: 'Upload wallpaper', removeWallpaper: 'Remove wallpaper', wallpaperHint: 'PNG, JPG or WEBP, up to 8 MB.', wallpaperTypeError: 'Only PNG, JPG or WEBP images are supported.', wallpaperSizeError: 'The wallpaper must be 8 MB or smaller.', wallpaperReadError: 'The wallpaper could not be loaded.', wallpaperStorageError: 'The wallpaper could not be saved. Try a smaller image.',
    account: 'Account', accountSettings: 'Account settings', profile: 'Profile', preferences: 'Preferences',
    playback: 'Playback', privacy: 'Privacy', help: 'Help & support', signOut: 'Sign out',
    accountReady: 'Local profile', accountDescription: 'Account management will be available soon.', profileSettings: 'Profile settings', profilePhotoDescription: 'Your profile photo appears here across the app.', choosePhoto: 'Upload image', removePhoto: 'Remove image', profilePhotoHint: 'PNG or JPG, up to 5 MB.', avatarTypeError: 'Only PNG or JPG images are supported.', avatarSizeError: 'The image must be 5 MB or smaller.', avatarReadError: 'The image could not be loaded.', appearance: 'Appearance', appearanceDescription: 'Choose a color mood for the app glass surfaces.', customTheme: 'Custom theme', customColors: 'Custom colors', backgroundColor: 'Background', violetColor: 'Violet accent', cyanColor: 'Cyan accent', pinkColor: 'Pink accent', playButtonStyle: 'Play button style', stylePrism: 'Prism', styleHalo: 'Halo', styleSolid: 'Glossy', styleMinimal: 'Minimal', glassIntensity: 'Glass surface', glassIntensityDescription: 'Liquid-glass styling is active', active: 'Active', close: 'Close',
  },
  zh: {
    home: '首页', search: '搜索', library: '音乐库', playlists: '播放列表',
    all: '全部', mine: '我的', vawesMix: 'VAWES精选', searchPlaceholder: '搜索歌曲、专辑或播放列表',
    clear: '清除', browse: '按播放列表浏览', results: '搜索结果', title: '歌曲', album: '专辑',
    duration: '时长', noResults: '没有找到：', tryAgain: '试试其他关键词。',
    libraryCount: (count) => `${count} 个已保存的播放列表`, recent: '最近播放',
    byName: '按名称', byLength: '按时长', librarySearch: '搜索播放列表',
    noLibrary: '没有找到结果。试试其他关键词，或选择全部。',
    playlist: '播放列表', tracks: (count, minutes) => `${count} 首歌曲 · ${minutes} 分钟`,
    discovery: 'VAWES / 探索', fresh: '你的心情，你的音乐。', forYou: '新鲜声音。',
    welcome: '新声音、轻快节奏和精选片段，陪伴你的下一次播放。',
    latest: '最新加入', releases: '新发布', allTracks: '全部歌曲',
    curated: '为你精选', moods: '音乐氛围', playerLibrary: '音乐库',
    morning: '早上好', afternoon: '下午好', evening: '晚上好', night: '晚安',
    previous: '上一首', play: '播放', pause: '暂停', next: '下一首',
    language: '语言', wallpaper: '自定义壁纸', chooseWallpaper: '上传壁纸', removeWallpaper: '移除壁纸', wallpaperHint: 'PNG、JPG 或 WEBP，最大 8 MB。', wallpaperTypeError: '仅支持 PNG、JPG 或 WEBP 图片。', wallpaperSizeError: '壁纸大小不能超过 8 MB。', wallpaperReadError: '无法读取壁纸。', wallpaperStorageError: '无法保存壁纸，请尝试更小的图片。',
    account: '账户', accountSettings: '账户设置', profile: '个人资料', preferences: '偏好设置',
    playback: '播放', privacy: '隐私', help: '帮助与支持', signOut: '退出登录',
    accountReady: '本地资料', accountDescription: '账户管理功能即将推出。', profileSettings: '个人资料设置', profilePhotoDescription: '你的头像会显示在应用的各个位置。', choosePhoto: '上传图片', removePhoto: '移除图片', profilePhotoHint: 'PNG 或 JPG，最大 5 MB。', avatarTypeError: '仅支持 PNG 或 JPG 图片。', avatarSizeError: '图片大小不能超过 5 MB。', avatarReadError: '无法读取图片。', appearance: '外观', appearanceDescription: '为应用的玻璃界面选择一种色彩氛围。', customTheme: '自定义主题', customColors: '自定义颜色', backgroundColor: '背景', violetColor: '紫色强调', cyanColor: '青色强调', pinkColor: '粉色强调', playButtonStyle: '播放按钮样式', stylePrism: '棱镜', styleHalo: '光环', styleSolid: '亮面', styleMinimal: '极简', glassIntensity: '玻璃界面', glassIntensityDescription: 'Liquid glass 样式已启用', active: '已启用', close: '关闭',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('vawes-language') ?? 'hu')
  const changeLanguage = (next) => {
    setLanguage(next)
    localStorage.setItem('vawes-language', next)
  }
  const value = useMemo(() => ({
    language,
    setLanguage: changeLanguage,
    t: (key, ...args) => typeof translations[language][key] === 'function'
      ? translations[language][key](...args)
      : translations[language][key] ?? translations.hu[key] ?? key,
    playlistName: (id) => playlists.find((playlist) => playlist.id === id)?.name ?? id,
  }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)

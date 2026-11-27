export const BASE_PALETTE = {
  violet: '#7c5cff',
  cyan: '#2dd4ff',
  pink: '#ff4fd8',
  orange: '#ff8c5a',
  green: '#5fd35f',
  blue: '#4f6bff',
  yellow: '#ffcf4a',
  red: '#e5484d',
}

export const DEFAULT_CUSTOM_THEME = {
  label: 'Custom',
  background: '#202a30',
  violet: '#9fb8bd',
  cyan: '#84969e',
  pink: '#b3c9cf',
}

export const THEMES = {
  steel: {
    label: 'Steel',
    labelKey: 'themeSteel',
    background: '#202a30',
    ink: '#d3dde0',
    muted: '#9aa9ae',
    accent: '#9fb8bd',
    accent2: '#84969e',
    surface: 'rgba(223,235,238,.055)',
    surface2: 'rgba(223,235,238,.022)',
    rim: 'rgba(210,228,232,.14)',
    rimSoft: 'rgba(210,228,232,.07)',
    shadow: 'rgba(8,14,18,.32)',
    palette: {
      violet: '#7f9aa0',
      cyan: '#9fb8bd',
      pink: '#b3c9cf',
      orange: '#b6ada3',
      green: '#8fa6ad',
      blue: '#84969e',
      yellow: '#c2c8c4',
      red: '#a98f92',
    },
  },
  dusk: {
    label: 'Dusk',
    labelKey: 'themeDusk',
    background: '#2a2a2c',
    ink: '#ddd9d4',
    muted: '#a9a29b',
    accent: '#b6ada3',
    accent2: '#90999a',
    surface: 'rgba(240,236,230,.05)',
    surface2: 'rgba(240,236,230,.02)',
    rim: 'rgba(240,236,230,.12)',
    rimSoft: 'rgba(240,236,230,.06)',
    shadow: 'rgba(14,12,10,.34)',
    palette: {
      violet: '#a08f80',
      cyan: '#b6ada3',
      pink: '#c2b3a8',
      orange: '#c29a7d',
      green: '#9aa394',
      blue: '#90999a',
      yellow: '#cfc4ad',
      red: '#b08f8f',
    },
  },
  frost: {
    label: 'Frost',
    labelKey: 'themeFrost',
    background: '#263238',
    ink: '#dfe7ea',
    muted: '#a6b6bd',
    accent: '#b3c9cf',
    accent2: '#8fa6ad',
    surface: 'rgba(235,247,250,.05)',
    surface2: 'rgba(235,247,250,.02)',
    rim: 'rgba(235,247,250,.12)',
    rimSoft: 'rgba(235,247,250,.06)',
    shadow: 'rgba(8,16,20,.32)',
    palette: {
      violet: '#8ba7b0',
      cyan: '#b3c9cf',
      pink: '#c0d6db',
      orange: '#b8b4aa',
      green: '#98b8b4',
      blue: '#8fa6ad',
      yellow: '#cbd5d0',
      red: '#a9969b',
    },
  },
  aurora: {
    label: 'Aurora',
    labelKey: 'themeAurora',
    background: '#0b0a1a',
    ink: '#e9e7f5',
    muted: '#a6a3ba',
    accent: '#7c5cff',
    accent2: '#2dd4ff',
    surface: 'rgba(235,232,255,.06)',
    surface2: 'rgba(235,232,255,.025)',
    rim: 'rgba(230,228,255,.14)',
    rimSoft: 'rgba(230,228,255,.07)',
    shadow: 'rgba(5,4,20,.35)',
    palette: { ...BASE_PALETTE },
  },
  ocean: {
    label: 'Deep ocean',
    labelKey: 'themeOcean',
    background: '#06141d',
    ink: '#e0edf2',
    muted: '#94aab4',
    accent: '#20d5c2',
    accent2: '#4169e1',
    surface: 'rgba(220,245,250,.055)',
    surface2: 'rgba(220,245,250,.022)',
    rim: 'rgba(210,240,245,.13)',
    rimSoft: 'rgba(210,240,245,.065)',
    shadow: 'rgba(2,10,16,.38)',
    palette: {
      ...BASE_PALETTE,
      violet: '#4169e1',
      cyan: '#20d5c2',
      pink: '#5d8dff',
    },
  },
  sunset: {
    label: 'Sunset glow',
    labelKey: 'themeSunset',
    background: '#1b0c1a',
    ink: '#f2e6ee',
    muted: '#b49aa8',
    accent: '#ff9b54',
    accent2: '#b04dff',
    surface: 'rgba(255,235,245,.055)',
    surface2: 'rgba(255,235,245,.022)',
    rim: 'rgba(255,225,240,.13)',
    rimSoft: 'rgba(255,225,240,.065)',
    shadow: 'rgba(16,4,14,.38)',
    palette: {
      ...BASE_PALETTE,
      violet: '#b04dff',
      cyan: '#ff9b54',
      pink: '#ff4f9a',
    },
  },
  graphite: {
    label: 'Graphite',
    labelKey: 'themeGraphite',
    background: '#101217',
    ink: '#dfe4ea',
    muted: '#98a1ad',
    accent: '#a3b8c8',
    accent2: '#737bff',
    surface: 'rgba(225,235,245,.055)',
    surface2: 'rgba(225,235,245,.022)',
    rim: 'rgba(220,230,240,.13)',
    rimSoft: 'rgba(220,230,240,.065)',
    shadow: 'rgba(4,6,10,.38)',
    palette: {
      ...BASE_PALETTE,
      violet: '#737bff',
      cyan: '#a3b8c8',
      pink: '#c084fc',
    },
  },
}

export const DEFAULT_THEME = 'steel'

const parseHex = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

const toHex = (channels) => `#${channels.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`

export function mixHex(foreground, background, weight = 0.5) {
  if (!/^#[0-9a-f]{6}$/i.test(foreground) || !/^#[0-9a-f]{6}$/i.test(background)) return foreground
  const amount = Math.min(1, Math.max(0, weight))
  const front = parseHex(foreground)
  const back = parseHex(background)
  return toHex(front.map((value, index) => value * amount + back[index] * (1 - amount)))
}

export function relativeLuminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0
  const [r, g, b] = parseHex(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function resolveTheme(themeId, customTheme = DEFAULT_CUSTOM_THEME) {
  if (themeId === 'custom') {
    const background = /^#[0-9a-f]{6}$/i.test(customTheme.background) ? customTheme.background : DEFAULT_CUSTOM_THEME.background
    const isLight = relativeLuminance(background) > 0.45
    const ink = isLight ? '#101416' : '#eef2f3'
    return {
      label: 'Custom',
      labelKey: 'customTheme',
      custom: true,
      isLight,
      background,
      ink,
      muted: mixHex(ink, background, 0.56),
      accent: customTheme.violet,
      accent2: customTheme.cyan,
      surface: isLight ? 'rgba(15,23,26,.05)' : 'rgba(255,255,255,.055)',
      surface2: isLight ? 'rgba(15,23,26,.02)' : 'rgba(255,255,255,.022)',
      rim: isLight ? 'rgba(15,23,26,.14)' : 'rgba(255,255,255,.14)',
      rimSoft: isLight ? 'rgba(15,23,26,.07)' : 'rgba(255,255,255,.07)',
      shadow: isLight ? 'rgba(15,23,26,.18)' : 'rgba(0,0,0,.34)',
      palette: {
        ...BASE_PALETTE,
        violet: customTheme.violet,
        cyan: customTheme.cyan,
        pink: customTheme.pink,
      },
    }
  }
  return Object.hasOwn(THEMES, themeId) ? THEMES[themeId] : THEMES[DEFAULT_THEME]
}

export function applyTheme(themeId, customTheme) {
  if (typeof document === 'undefined') return
  const theme = resolveTheme(themeId, customTheme)
  const root = document.documentElement
  const variables = {
    '--app-bg': theme.background,
    '--app-ink': theme.ink,
    '--app-muted': theme.muted,
    '--app-surface': theme.surface,
    '--app-surface-2': theme.surface2,
    '--app-rim': theme.rim,
    '--app-rim-soft': theme.rimSoft,
    '--accent': theme.accent,
    '--accent-2': theme.accent2,
    '--shadow': theme.shadow,
  }
  Object.entries(theme.palette).forEach(([name, value]) => {
    variables[`--${name}`] = value
  })
  // Text on accent-filled controls (e.g. the sign-in button): pick whichever of white/near-black reads better.
  const accentStops = [theme.palette.violet, mixHex(theme.palette.cyan, theme.palette.violet, 0.7)]
  const accentLuminance = accentStops.reduce((sum, hex) => sum + relativeLuminance(hex), 0) / accentStops.length
  variables['--accent-ink'] = accentLuminance > 0.179 ? '#0b0d10' : '#ffffff'
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))
  root.dataset.theme = themeId
  root.dataset.themeTone = theme.isLight ? 'light' : 'dark'
  root.style.colorScheme = theme.isLight ? 'light' : 'dark'
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', theme.background)
}

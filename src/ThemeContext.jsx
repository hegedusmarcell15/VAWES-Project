import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'
import {
  DEFAULT_CUSTOM_THEME,
  DEFAULT_THEME,
  THEMES,
  applyTheme,
  resolveTheme,
} from './theme.js'

const ThemeContext = createContext(null)

function readTheme() {
  try {
    const saved = localStorage.getItem('vawes-theme')
    return saved === 'custom' || (saved && Object.hasOwn(THEMES, saved)) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function readCustomTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('vawes-custom-theme') ?? 'null')
    const valid = saved && ['background', 'violet', 'cyan', 'pink'].every((key) => /^#[0-9a-f]{6}$/i.test(saved[key]))
    return valid ? { ...DEFAULT_CUSTOM_THEME, ...saved } : DEFAULT_CUSTOM_THEME
  } catch {
    return DEFAULT_CUSTOM_THEME
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme)
  const [customTheme, setCustomTheme] = useState(readCustomTheme)

  useLayoutEffect(() => {
    applyTheme(theme, customTheme)
    try {
      localStorage.setItem('vawes-theme', theme)
      localStorage.setItem('vawes-custom-theme', JSON.stringify(customTheme))
    } catch {
      // Theme selection still works when storage is unavailable.
    }
  }, [theme, customTheme])

  const updateCustomColor = useCallback((key, value) => {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return
    setCustomTheme((current) => ({ ...current, [key]: value }))
    setTheme('custom')
  }, [])

  const value = useMemo(() => ({
    theme,
    setTheme,
    customTheme,
    setCustomTheme,
    updateCustomColor,
    themes: THEMES,
    resolvedTheme: resolveTheme(theme, customTheme),
  }), [theme, customTheme, updateCustomColor])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

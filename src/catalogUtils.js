export const COLORS = {
  violet: '#7c5cff',
  cyan: '#2dd4ff',
  pink: '#ff4fd8',
  orange: '#ff8c5a',
  green: '#5fd35f',
  blue: '#4f6bff',
  yellow: '#ffcf4a',
  red: '#e5484d',
}

export const fmt = (seconds) => {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
}

export const norm = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ')

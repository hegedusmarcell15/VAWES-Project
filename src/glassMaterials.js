// Rounded-rectangle bezel: the inward normal follows straight edges and corner arcs.
function roundedEdge(x, y, size, radius) {
  const last = size - 1
  const left = x < radius
  const right = x > last - radius
  const top = y < radius
  const bottom = y > last - radius

  if ((left || right) && (top || bottom)) {
    const cx = left ? radius : last - radius
    const cy = top ? radius : last - radius
    const dx = x - cx
    const dy = y - cy
    const length = Math.hypot(dx, dy) || 1
    return {
      distance: radius - length,
      nx: -dx / length,
      ny: -dy / length,
    }
  }
  if (left) return { distance: x, nx: 1, ny: 0 }
  if (right) return { distance: last - x, nx: -1, ny: 0 }
  if (top) return { distance: y, nx: 0, ny: 1 }
  if (bottom) return { distance: last - y, nx: 0, ny: -1 }
  return { distance: size, nx: 0, ny: 0 }
}

// Convex squircle surface: f(t) = (1 - (1 - t)^4)^(1/4).
// Snell's law gives the inward ray displacement; normalise to 0..1 for RGB.
export function buildLensMap(size = 512, radius = 72) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const image = ctx.createImageData(size, size)
  const vectors = new Float32Array(size * size * 2)
  const bezelPx = size * 0.3
  const glassIndex = 1.5
  const thickness = 0.82
  let peak = 0

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = roundedEdge(x, y, size, radius)
      const t = Math.min(1, Math.max(0, edge.distance) / bezelPx)
      let bend = 0

      if (edge.distance >= 0 && t < 1) {
        const u = 1 - (1 - t) ** 4
        const height = Math.max(u, 1e-6) ** 0.25
        const slope = Math.min(48, (1 - t) ** 3 / height ** 3)
        const sin1 = slope / Math.sqrt(1 + slope * slope)
        const sin2 = Math.min(0.999, sin1 / glassIndex)
        const cos2 = Math.sqrt(1 - sin2 * sin2)
        bend = thickness * (sin2 / cos2)
      }

      const slot = (y * size + x) * 2
      vectors[slot] = edge.nx * bend
      vectors[slot + 1] = edge.ny * bend
      if (bend > peak) peak = bend
    }
  }

  const scale = peak || 1
  for (let i = 0; i < size * size; i += 1) {
    const px = Math.round(128 + (vectors[i * 2] / scale) * 127)
    const py = Math.round(128 + (vectors[i * 2 + 1] / scale) * 127)
    const offset = i * 4
    image.data[offset] = px
    image.data[offset + 1] = py
    image.data[offset + 2] = 128
    image.data[offset + 3] = 255
  }

  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

// Angle-weighted rim light, kept at low alpha so it reads as glass rather than chrome.
export function buildSpecularMap(size = 512, radius = 72, bezel = 88) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const image = ctx.createImageData(size, size)
  const lightX = Math.cos(-Math.PI / 3)
  const lightY = Math.sin(-Math.PI / 3)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = roundedEdge(x, y, size, radius)
      if (edge.distance < 0 || edge.distance > bezel) continue

      const falloff = (1 - edge.distance / bezel) ** 1.5
      const alignment = 0.35 + 0.65 * Math.abs(edge.nx * lightX + edge.ny * lightY)
      const offset = (y * size + x) * 4
      image.data[offset] = 232
      image.data[offset + 1] = 240
      image.data[offset + 2] = 242
      image.data[offset + 3] = Math.round(90 * falloff * alignment)
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

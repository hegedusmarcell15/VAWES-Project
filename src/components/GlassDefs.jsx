import { useEffect, useState } from 'react'
import { buildLensMap, buildSpecularMap } from '../glassMaterials.js'

export default function GlassDefs() {
  const [maps, setMaps] = useState(null)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      try {
        const lens = buildLensMap()
        const specular = buildSpecularMap()
        setMaps(lens && specular ? { lens, specular } : null)
      } catch {
        setMaps(null)
      }
    }, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!maps) return undefined
    const root = document.documentElement
    root.style.setProperty('--glass-lens', 'url(#vawes-liquid-lens)')
    root.style.setProperty('--glass-drop-lens', 'url(#vawes-liquid-drop)')
    root.style.setProperty('--glass-specular', `url("${maps.specular}")`)
    return () => {
      root.style.removeProperty('--glass-lens')
      root.style.removeProperty('--glass-drop-lens')
      root.style.removeProperty('--glass-specular')
    }
  }, [maps])

  return (
    <svg className="glass-defs" aria-hidden="true" focusable="false">
      <defs>
        {maps && (
          <>
            <filter id="vawes-liquid-lens" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feImage href={maps.lens} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="map" />
              <feGaussianBlur in="map" stdDeviation="0.45" result="smoothMap" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.18" result="blurredSource" />
              <feDisplacementMap in="blurredSource" in2="smoothMap" scale="11" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feColorMatrix in="displaced" type="saturate" values="1.08" result="displacedSaturated" />
              <feImage href={maps.specular} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="specularLayer" />
              <feComposite in="displacedSaturated" in2="specularLayer" operator="in" result="specularSaturated" />
              <feComponentTransfer in="specularLayer" result="specularFaded">
                <feFuncA type="linear" slope="0.10" />
              </feComponentTransfer>
              <feBlend in="specularSaturated" in2="displaced" mode="normal" result="withSaturation" />
              <feBlend in="specularFaded" in2="withSaturation" mode="normal" />
            </filter>
            <filter id="vawes-liquid-drop" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feImage href={maps.lens} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="map" />
              <feGaussianBlur in="map" stdDeviation="0.45" result="smoothMap" />
              <feDisplacementMap in="SourceGraphic" in2="smoothMap" scale="4" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </>
        )}
      </defs>
    </svg>
  )
}

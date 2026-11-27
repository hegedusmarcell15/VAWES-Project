import { memo } from 'react'
import { COLORS } from '../catalogUtils.js'

function Cover({ color, size = 'md', image }) {
  return (
    <span
      className={`cover ${size}`}
      style={{
        '--c': `var(--${COLORS[color] ? color : 'violet'}, ${COLORS[color] ?? COLORS.violet})`,
        '--cover-image': 'none',
      }}
    >
      {image && <img src={image} alt="" loading="lazy" decoding="async" />}
    </span>
  )
}

export default memo(Cover)

const paths = {
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.2 4.2" /></>,
  close: <><path d="M7.2 7.2 16.8 16.8" /><path d="M16.8 7.2 7.2 16.8" /></>,
  check: <path d="m5.2 12.4 4.2 4.2L19 7" />,
  previous: <><path d="M6.4 5.5v13" /><path d="M18.2 7.1c0-.8-.9-1.3-1.6-.8L9.4 11.2c-.6.4-.6 1.2 0 1.6l7.2 4.9c.7.5 1.6 0 1.6-.8V7.1Z" fill="currentColor" stroke="none" /></>,
  next: <><path d="M17.6 5.5v13" /><path d="M5.8 7.1c0-.8.9-1.3 1.6-.8l7.2 4.9c.6.4.6 1.2 0 1.6l-7.2 4.9c-.7.5-1.6 0-1.6-.8V7.1Z" fill="currentColor" stroke="none" /></>,
  play: <path d="M8.3 5.6c0-.9 1-1.4 1.8-.9l8.2 5.5c.7.5.7 1.6 0 2.1l-8.2 5.5c-.8.5-1.8 0-1.8-.9V5.6Z" fill="currentColor" stroke="none" />,
  pause: <><rect x="7" y="5.2" width="3.4" height="13.6" rx="1.2" fill="currentColor" stroke="none" /><rect x="13.6" y="5.2" width="3.4" height="13.6" rx="1.2" fill="currentColor" stroke="none" /></>,
  shuffle: <><path d="M4 7h2.7c4.2 0 5 10 9.6 10H20" /><path d="M4 17h2.7c1.5 0 2.5-1.4 3.3-3" /><path d="M14 9.6c.8-1.5 1.7-2.6 3-2.6h3" /><path d="m17.4 3.8 2.8 3.2-2.8 3.2" /><path d="m17.4 14.2 2.8 3.2-2.8 3.2" /></>,
  repeat: <><path d="M4 11.2V9.8A3.3 3.3 0 0 1 7.3 6.5H20" /><path d="m17.4 3.7 2.8 2.8-2.8 2.8" /><path d="M20 12.8v1.4a3.3 3.3 0 0 1-3.3 3.3H4" /><path d="m6.6 17.5-2.8 2.8 2.8 2.8" /></>,
  repeatOne: <><path d="M4 11.2V9.8A3.3 3.3 0 0 1 7.3 6.5H20" /><path d="m17.4 3.7 2.8 2.8-2.8 2.8" /><path d="M20 12.8v1.4a3.3 3.3 0 0 1-3.3 3.3H4" /><path d="m6.6 17.5-2.8 2.8 2.8 2.8" /><path d="M12 10.2h1.6v4.2" /><path d="m11.2 11.1 1.6-1" /></>,
  volume: <><path d="M11 5.4 6.5 9.2H3.6v5.6h2.9L11 18.6V5.4Z" fill="currentColor" stroke="none" opacity=".92" /><path d="M15 9a4.2 4.2 0 0 1 0 6" /><path d="M17.8 6.2a8 8 0 0 1 0 11.6" /></>,
  volumeMuted: <><path d="M11 5.4 6.5 9.2H3.6v5.6h2.9L11 18.6V5.4Z" fill="currentColor" stroke="none" opacity=".92" /><path d="m15.2 9.2 4.8 5.6" /><path d="m20 9.2-4.8 5.6" /></>,
  heart: <path d="M20.4 9.1c0 4-8.4 9.7-8.4 9.7s-8.4-5.7-8.4-9.7a4.6 4.6 0 0 1 8.4-2.5 4.6 4.6 0 0 1 8.4 2.5Z" />,
  music: <><path d="M9.2 18.2V6.8l9.2-2v11.2" /><ellipse cx="6.6" cy="18.2" rx="2.6" ry="2" /><ellipse cx="15.8" cy="16" rx="2.6" ry="2" /></>,
  queue: <><path d="M4 7h10M4 12h10M4 17h5.5" /><path d="M17.4 8.2v8.4" /><circle cx="17.4" cy="18.3" r="1.6" fill="currentColor" stroke="none" /></>,
  edit: <><path d="m14.2 5.2 4.6 4.6" /><path d="M4.5 19.5 5 15.8 18.2 2.6a2 2 0 0 1 2.8 2.8L7.8 18.6l-3.3.9Z" /></>,
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  up: <path d="m6.2 14.4 5.8-5.8 5.8 5.8" />,
  down: <path d="m6.2 9.6 5.8 5.8 5.8-5.8" />,
  arrowRight: <><path d="M4.5 12h14" /><path d="m13.4 6.6 5.4 5.4-5.4 5.4" /></>,
  external: <><path d="M13.2 5.4h5.4v5.4" /><path d="m18.6 5.4-8 8" /><path d="M18 14v4.2H5.8V6h4.2" /></>,
  globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16" /><path d="M12 4c2.2 2.2 3.2 4.9 3.2 8S14.2 17.8 12 20c-2.2-2.2-3.2-4.9-3.2-8S9.8 6.2 12 4Z" /></>,
  user: <><circle cx="12" cy="8.2" r="3.2" /><path d="M5.6 19c.8-3 2.9-4.6 6.4-4.6s5.6 1.6 6.4 4.6" /></>,
  users: <><circle cx="9.4" cy="8.4" r="3" /><path d="M3.8 18.6c.6-2.8 2.6-4.2 5.6-4.2s5 1.4 5.6 4.2" /><path d="M15.8 6.2a2.7 2.7 0 0 1 0 5.2" /><path d="M17.2 14.6c1.7.5 2.7 1.8 3 4" /></>,
  shield: <><path d="M12 3.2 19 6v5c0 4.4-2.8 7.6-7 9.8-4.2-2.2-7-5.4-7-9.8V6l7-2.8Z" /><path d="m9 12 2 2 4-4" /></>,
  settings: <><circle cx="12" cy="12" r="2.5" /><path d="m19 12 2-1.1-1.4-2.4-2.1.6a7 7 0 0 0-1.6-.9L15.6 6h-3l-.3 2.2a7 7 0 0 0-1.6.9l-2.1-.6L7.2 11l2 1.1a7 7 0 0 0 0 1.8l-2 1.1 1.4 2.4 2.1-.6c.5.4 1 .7 1.6.9l.3 2.2h3l.3-2.2a7 7 0 0 0 1.6-.9l2.1.6 1.4-2.4-2-1.1a7 7 0 0 0 0-1.8Z" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  chevronRight: <path d="m10 8 4 4-4 4" />,
  lock: <><rect x="5" y="10.2" width="14" height="9.4" rx="2.4" /><path d="M8.4 10.2V7.6a3.6 3.6 0 0 1 7.2 0v2.6" /><circle cx="12" cy="14.8" r="1.2" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M10.4 5.2H6.2A2.2 2.2 0 0 0 4 7.4v9.2a2.2 2.2 0 0 0 2.2 2.2h4.2" /><path d="m14.6 8.2 3.8 3.8-3.8 3.8" /><path d="M18 12H9.2" /></>,
  upload: <><path d="M12 16V4.8" /><path d="m7.8 9 4.2-4.2L16.2 9" /><path d="M5 15.4v3.2A1.4 1.4 0 0 0 6.4 20h11.2a1.4 1.4 0 0 0 1.4-1.4v-3.2" /></>,
  disc: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.2" /><path d="M12 4a8 8 0 0 1 7.5 5.2" /></>,
  sparkle: <><path d="M12 3.6 13.6 9l5.4 1.6-5.4 1.6L12 17.6 10.4 12.2 5 10.6 10.4 9 12 3.6Z" /><path d="m18.4 16.2.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" /></>,
}

export default function Icon({ name, size = 18, strokeWidth = 1.7 }) {
  const glyph = paths[name] ?? paths.sparkle
  return (
    <svg
      className={`icon icon-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}

const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
  close: <><path d="m7 7 10 10M17 7 7 17" /></>,
  previous: <><path d="M6 5v14M18 7l-7 5 7 5V7Z" /></>,
  next: <><path d="M18 5v14M6 7l7 5-7 5V7Z" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: <><path d="M8 6v12M16 6v12" /></>,
  shuffle: <><path d="m16 3 4 4-4 4" /><path d="M4 7h3c5 0 5 10 10 10h3" /><path d="m16 13 4 4-4 4" /><path d="M4 17h3c1.7 0 2.8-1.6 3.8-3.5M14.2 9.5C15 8.1 15.8 7 17 7h3" /></>,
  repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
  repeatOne: <><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /><path d="M12 9v6m-1.5-4.5L12 9l1.5 1.5" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  volumeMuted: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m16 9 5 6m0-6-5 6" /></>,
  heart: <path d="M20.8 8.7c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />,
  edit: <><path d="m14 5 5 5" /><path d="m4 20 4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  up: <path d="m6 14 6-6 6 6" />,
  down: <path d="m6 10 6 6 6-6" />,
  arrowRight: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  external: <><path d="M13 5h6v6" /><path d="m19 5-8 8" /><path d="M18 13v5H6V6h5" /></>,
  globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.2 2.2 3.2 4.9 3.2 8S14.2 17.8 12 20c-2.2-2.2-3.2-4.9-3.2-8S9.8 6.2 12 4Z" /></>,
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19c.8-3 2.9-4.6 6.5-4.6s5.7 1.6 6.5 4.6" /></>,
  settings: <><circle cx="12" cy="12" r="2.6" /><path d="m19 12 2-1.1-1.4-2.4-2.1.6a7 7 0 0 0-1.6-.9L15.6 6h-3l-.3 2.2a7 7 0 0 0-1.6.9l-2.1-.6L7.2 11l2 1.1a7 7 0 0 0 0 1.8l-2 1.1 1.4 2.4 2.1-.6c.5.4 1 .7 1.6.9l.3 2.2h3l.3-2.2a7 7 0 0 0 1.6-.9l2.1.6 1.4-2.4-2-1.1a7 7 0 0 0 0-1.8Z" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
}

export default function Icon({ name, size = 18, strokeWidth = 1.8 }) {
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
      {paths[name]}
    </svg>
  )
}

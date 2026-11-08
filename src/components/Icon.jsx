const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
  close: <><path d="m7 7 10 10M17 7 7 17" /></>,
  previous: <><path d="M6 5v14M18 7l-7 5 7 5V7Z" /></>,
  next: <><path d="M18 5v14M6 7l7 5-7 5V7Z" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  pause: <><path d="M8 6v12M16 6v12" /></>,
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

import { type ReactNode } from 'react'
const iconPaths: Record<string, string> = {
  University:
    'M2 9l10-6 10 6 M3 21h18 M5 10v8 M10 10v8 M14 10v8 M19 10v8 M2 9h20',
  Location:
    'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  Search: 'M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
  Dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  Events:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2 M7 14h3 M14 14h3 M7 18h3',
  Announcements: 'M3 10v4h4l11 5V5L7 10H3 M7 14l2 7h3l-2-6 M21 9v6',
  Donations: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 2 9 8 14 6-5 12-10 8-14z',
  Messenger:
    'M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5z M8 11h.01 M12 11h.01 M16 11h.01',
  Careers: 'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 11v4h4v-4',
  Mentors:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  Gallery: 'M3 3h18v18H3z M3 16l5-5 4 4 3-3 6 6 M8 7h.01',
  People: 'M4 4h16v16H4z M9 4v16 M12 9h5 M12 13h5',
  Schedule:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2 M8 15l3 3 5-5',
  Profile:
    'M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  Settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  Logout: 'M9 4H3v16h6 M9 12h12 M17 8l4 4-4 4',
  Menu: 'M4 6h16 M4 12h16 M4 18h16',
  Close: 'M6 6l12 12 M6 18L18 6',
  Arrow: 'M5 12h14 M14 7l5 5-5 5',
}

export function Icon({ name }: { name: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] || iconPaths.Profile} />
    </svg>
  )
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

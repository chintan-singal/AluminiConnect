import { useEffect, useRef, useState } from 'react'
import { api, ApiError, fields, type Member, type Run } from './shared'
import { Programme, Schedule } from './Programme'
import { People, Messages, Profile } from './Community'
import { Desk } from './Desk'
import {
  Dashboard,
  Announcements,
  CommunitySection,
  Icon,
  initials,
} from './Portal'
import { ThemeProvider } from './Theme'
import {
  CampusImage,
  UniversityBrand,
  UniversityPage,
  Credits,
  PortalFooter,
  PhotoCredit,
  ResourceCards,
} from './Institution'
function Access({ run, refresh }: { run: Run; refresh: () => Promise<void> }) {
  const [register, switchMode] = useState(false)
  return (
    <>
      <div className="welcome">
        <div className="intro">
          <span className="kicker">
            SOUTH ASIAN UNIVERSITY · ALUMNI NETWORK
          </span>
          <h1>
            Your journey
            <br />
            <em>continues here.</em>
          </h1>
          <p>
            A place to reconnect, exchange ideas, and keep the spirit of South
            Asia close. Welcome to your alumni community.
          </p>
          <figure className="welcome-photo">
            <CampusImage priority />
            <figcaption>
              Maidan Garhi, New Delhi <PhotoCredit />
            </figcaption>
          </figure>
        </div>
        <section className="paper">
          <h2>{register ? 'Join the directory' : 'Member sign in'}</h2>
          <form
            key={String(register)}
            onSubmit={(e) => {
              e.preventDefault()
              const data = fields(e.currentTarget)
              void run(async () => {
                if (register)
                  await api('/auth/register', 'POST', {
                    ...data,
                    batch: Number(data.batch),
                  })
                await api('/auth/login', 'POST', {
                  email: data.email,
                  password: data.password,
                })
                await refresh()
              })
            }}
          >
            {register && (
              <>
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Graduation year
                  <input
                    name="batch"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    required
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 10 : 1}
                required
              />
            </label>
            <button className="primary">
              {register ? 'Submit application' : 'Sign in'} ↗
            </button>
          </form>
          <button className="link" onClick={() => switchMode(!register)}>
            {register ? 'Already a member? Sign in' : 'New here? Apply to join'}
          </button>
        </section>
      </div>
      <ResourceCards />
    </>
  )
}
function PortalApp() {
  const [me, setMe] = useState<Member | null>(),
    [tab, setTab] = useState('Dashboard'),
    [version, bump] = useState(0)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    lock = useRef(false)
  const [peer, setPeer] = useState<number | null>(null),
    [mentor, setMentor] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', close)
    }
  }, [menuOpen])
  async function refresh() {
    try {
      setMe(await api<Member>('/me'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null)
      else throw e
    }
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message))
  }, [])
  useEffect(() => {
    const update = () => {
      if (!document.hidden) bump((v) => v + 1)
    }
    window.addEventListener('focus', update)
    const timer = setInterval(update, 30000)
    return () => {
      window.removeEventListener('focus', update)
      clearInterval(timer)
    }
  }, [])
  const run: Run = async (task) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
      if (e instanceof ApiError && e.status === 401) setMe(null)
    } finally {
      lock.current = false
      setBusy(false)
      bump((v) => v + 1)
    }
  }
  function nav(name: string) {
    setTab(name)
    setError('')
    setMentor(null)
    setMenuOpen(false)
  }
  function logout() {
    void run(async () => {
      await api('/auth/logout', 'POST')
      setMe(null)
      nav('Dashboard')
      setPeer(null)
    })
  }
  const approved = me?.status === 'approved'
  const destinations = [
    ['Dashboard', 'Dashboard'],
    ['Events', 'Events'],
    ['Announcements', 'Announcements'],
    ['Donations', 'Donations'],
    ['Messenger', 'Messenger'],
    ['Careers', 'Careers'],
    ['Mentors', 'Mentors'],
    ['Gallery', 'Gallery'],
    ['People', 'Alumni directory'],
    ['Schedule', 'My schedule'],
  ]
  const content = () => {
    if (me === undefined) return <p role="status">Connecting to campus…</p>
    if (!me) {
      if (tab === 'University') return <UniversityPage />
      if (tab === 'Sources & credits') return <Credits />
      return <Access run={run} refresh={refresh} />
    }
    if (!approved)
      return (
        <section className="paper review-status">
          <span className="icon-tile">
            <Icon name="Profile" />
          </span>
          <h1>Application {me.status}</h1>
          <p>
            {me.status === 'pending'
              ? 'The alumni office is reviewing your details.'
              : 'Contact the alumni office to discuss your application.'}
          </p>
          <button onClick={() => run(refresh)}>Check status</button>
        </section>
      )
    switch (tab) {
      case 'Dashboard':
        return <Dashboard member={me} version={version} navigate={nav} />
      case 'Events':
        return (
          <Programme
            key={mentor || 0}
            initialMentor={mentor}
            memberId={me.id}
            version={version}
            run={run}
          />
        )
      case 'Announcements':
        return <Announcements version={version} />
      case 'My schedule':
        return <Schedule version={version} run={run} memberId={me.id} />
      case 'Alumni directory':
      case 'Mentors':
        return (
          <People
            key={tab}
            mentorsOnly={tab === 'Mentors'}
            version={version}
            me={me.id}
            member={me}
            profile={() => nav('Profile')}
            chat={(id) => {
              setPeer(id)
              nav('Messenger')
            }}
            mentor={(id) => {
              nav('Events')
              setMentor(id)
            }}
          />
        )
      case 'Messenger':
        return (
          <Messages version={version} me={me.id} initial={peer} run={run} />
        )
      case 'Profile':
        return <Profile member={me} run={run} refresh={refresh} />
      case 'Organizer desk':
        return <Desk version={version} run={run} />
      case 'University':
        return <UniversityPage />
      case 'Sources & credits':
        return <Credits />
      default:
        return <CommunitySection tab={tab} navigate={nav} version={version} memberId={me.id} chat={(id) => {
          setPeer(id)
          nav('Messenger')
        }} />
    }
  }
  return (
    <div className={approved ? 'portal-shell' : 'public-shell'}>
      {approved && (
        <>
          {menuOpen && (
            <button
              className="sidebar-backdrop"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            />
          )}
          <aside
            className={'sidebar' + (menuOpen ? ' is-open' : '')}
            id="portal-sidebar"
          >
            <a
              className="brand"
              href="#dashboard"
              onClick={(event) => {
                event.preventDefault()
                nav('Dashboard')
              }}
            >
              <UniversityBrand />
            </a>
            <nav aria-label="Main">
              {destinations.map(([icon, label]) => (
                <button
                  key={label}
                  aria-current={tab === label ? 'page' : undefined}
                  onClick={() => nav(label)}
                >
                  <span className="nav-icon">
                    <Icon name={icon} />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
              {me?.role === 'organizer' && (
                <button
                  aria-current={tab === 'Organizer desk' ? 'page' : undefined}
                  onClick={() => nav('Organizer desk')}
                >
                  <span className="nav-icon">
                    <Icon name="Settings" />
                  </span>
                  Organizer desk
                </button>
              )}
            </nav>
            <div className="sidebar-bottom">
              <button
                aria-current={tab === 'University' ? 'page' : undefined}
                onClick={() => nav('University')}
              >
                <span className="nav-icon">
                  <Icon name="University" />
                </span>
                Our university
              </button>
              <button
                aria-current={tab === 'Profile' ? 'page' : undefined}
                onClick={() => nav('Profile')}
              >
                <span className="nav-icon">
                  <Icon name="Profile" />
                </span>
                Profile & settings
              </button>
              <button disabled={busy} onClick={logout}>
                <span className="nav-icon">
                  <Icon name="Logout" />
                </span>
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}
      <header className="topbar">
        {approved ? (
          <div className="topbar-context">
            <button
              ref={menuButton}
              className="icon-button menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-controls="portal-sidebar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? 'Close' : 'Menu'} />
            </button>
            <span className="breadcrumb">
              SAU Alumni <span aria-hidden="true">/</span> <b>{tab}</b>
            </span>
          </div>
        ) : (
          <>
            <a
              className="brand"
              href="#home"
              onClick={(event) => {
                event.preventDefault()
                nav('Dashboard')
              }}
            >
              <UniversityBrand />
            </a>
            {!me && <div className="public-navigation">
              <button className="text-button" onClick={() => nav('University')}>
                Our university
              </button>
              <button className="secondary" onClick={() => nav('Dashboard')}>
                Alumni sign in
              </button>
            </div>}
          </>
        )}
        {me && (
          <div className="account">
            {approved ? (
              <>
                <button
                  className="icon-button messenger-shortcut"
                  aria-label="Open messenger"
                  onClick={() => nav('Messenger')}
                >
                  <Icon name="Messenger" />
                </button>
                <button
                  className="account-button"
                  aria-label="Open profile"
                  onClick={() => nav('Profile')}
                >
                  <span className="avatar">{initials(me.name)}</span>
                  <span className="account-name">
                    <strong>{me.name}</strong>
                    <small>Class of {me.batch}</small>
                  </span>
                  <span className="account-chevron" aria-hidden="true">
                    ⌄
                  </span>
                </button>
              </>
            ) : (
              <button className="text-button" disabled={busy} onClick={logout}>
                Sign out
              </button>
            )}
          </div>
        )}
      </header>
      <main className="main-content" id="main-content">
        {error && (
          <p role="alert" className="alert">
            {error}
            {me === undefined && (
              <button onClick={() => run(refresh)}>Retry connection</button>
            )}
          </p>
        )}
        <fieldset className="workspace" disabled={busy}>
          {content()}
        </fieldset>
        <PortalFooter navigate={nav} />
      </main>
    </div>
  )
}

export function App() {
  return (
    <ThemeProvider>
      <PortalApp />
    </ThemeProvider>
  )
}

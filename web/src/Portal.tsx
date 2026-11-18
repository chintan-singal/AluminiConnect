import { useState } from 'react'
import {
  useData,
  Result,
  type Member,
  type EventItem,
  type Notice,
  type Page,
} from './shared'
import { Icon, initials, EmptyState } from './ui'
import { CareerListings } from './Careers'
import {
  CampusImage,
  PageHeading,
  PhotoCredit,
  PhotoGallery,
  ResourceCards,
} from './Institution'
export { Icon, initials, EmptyState } from './ui'

function BlockHeading({
  title,
  eyebrow,
  onClick,
}: {
  title: string
  eyebrow?: string
  onClick: () => void
}) {
  return (
    <div className="block-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      <button className="text-button" onClick={onClick}>
        View all <Icon name="Arrow" />
      </button>
    </div>
  )
}

export function Announcements({ version }: { version: number }) {
  const [cursor, setCursor] = useState('')
  const result = useData<Page<Notice>>(
    '/announcements' + (cursor ? '?before=' + cursor : ''),
    version,
  )
  return (
    <>
      <PageHeading
        eyebrow="FROM THE COMMUNITY"
        title="Announcements"
        description="The latest from the people and places that connect us."
      />
      <Result result={result}>
        {(list) => (
          <>
            <div className="announcement-list">
              {list.items.map((notice) => (
                <article className="panel notice" key={notice._id}>
                  <span className="icon-tile">
                    <Icon name="Announcements" />
                  </span>
                  <div>
                    <span className="eyebrow">{notice.authorName}</span>
                    <h2>{notice.title}</h2>
                    <p className="body">{notice.body}</p>
                  </div>
                </article>
              ))}
            </div>
            {!list.items.length && (
              <div className="panel">
                <EmptyState icon="Announcements" title="No announcements yet">
                  Updates from the alumni office will appear here.
                </EmptyState>
              </div>
            )}
            <div className="pagination">
              {cursor && (
                <button onClick={() => setCursor('')}>Latest notices</button>
              )}
              {list.next && (
                <button onClick={() => setCursor(list.next!)}>
                  Older notices
                </button>
              )}
            </div>
          </>
        )}
      </Result>
      <ResourceCards />
    </>
  )
}

export function Dashboard({
  member,
  version,
  navigate,
}: {
  member: Member
  version: number
  navigate: (tab: string) => void
}) {
  const events = useData<EventItem[]>('/events?page=1', version)
  const notices = useData<Page<Notice>>('/announcements', version)
  const mentors = useData<Member[]>('/members?mentor=true', version)
  const completed = [
    member.name,
    member.city,
    member.field,
    member.mentorTopic,
    member.visible,
  ].filter(Boolean).length
  const completion = completed * 20
  return (
    <>
      <PageHeading
        eyebrow="YOUR ALUMNI COMMUNITY"
        title={'Welcome back, ' + member.name.split(' ')[0]}
        description={
          'Class of ' + member.batch + (member.city ? ' · ' + member.city : '')
        }
      >
        <button className="secondary" onClick={() => navigate('My schedule')}>
          <Icon name="Schedule" />
          My schedule
        </button>
      </PageHeading>
      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="eyebrow">SOUTH ASIAN UNIVERSITY · NEW DELHI</span>
          <h2>
            Different journeys.
            <br />
            <em>A shared beginning.</em>
          </h2>
          <p>
            Reconnect with your people. Share what you have learned. Make room
            for what comes next.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('Alumni directory')}>
              Find your community <Icon name="Arrow" />
            </button>
            <button
              className="hero-text-button"
              onClick={() => navigate('Events')}
            >
              Explore events
            </button>
          </div>
        </div>
        <div className="community-hero-photo">
          <CampusImage priority />
          <span className="hero-photo-label">Maidan Garhi, New Delhi</span>
        </div>
      </section>
      <div className="hero-credit">
        <PhotoCredit />
      </div>
      <div className="quick-paths">
        {[
          [
            'People',
            'Find a familiar face',
            'Reconnect with your alumni network.',
            'Alumni directory',
          ],
          [
            'Mentors',
            'Share a little guidance',
            'Learn from someone who has been there.',
            'Mentors',
          ],
          [
            'Events',
            'Make time to connect',
            'Reunions, conversations and office hours.',
            'Events',
          ],
        ].map(([icon, title, copy, tab]) => (
          <button key={tab} onClick={() => navigate(tab)}>
            <span className="icon-tile">
              <Icon name={icon} />
            </span>
            <span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
            <Icon name="Arrow" />
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section>
            <BlockHeading
              title="Happening in your community"
              eyebrow="COME TOGETHER"
              onClick={() => navigate('Events')}
            />
            <Result result={events}>
              {(items) =>
                items.length ? (
                <div className={'dashboard-event-grid' + (items.length === 1 ? ' single' : '')}>
                    {items.slice(0, 2).map((event) => (
                      <EventPreview
                        event={event}
                        key={event.id}
                        onClick={() => navigate('Events')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="panel">
                    <EmptyState icon="Events" title="No upcoming events">
                      Your next reunion or mentor session will appear here.
                    </EmptyState>
                  </div>
                )
              }
            </Result>
          </section>
          <section>
            <BlockHeading
              title="The alumni bulletin"
              eyebrow="STAY IN THE LOOP"
              onClick={() => navigate('Announcements')}
            />
            <Result result={notices}>
              {(list) =>
                list.items.length ? (
                  <div className="notice-grid">
                    {list.items.slice(0, 2).map((notice) => (
                      <button
                        className="panel notice-preview"
                        key={notice._id}
                        onClick={() => navigate('Announcements')}
                      >
                        <span className="eyebrow">{notice.authorName}</span>
                        <strong>{notice.title}</strong>
                        <span className="preview-copy">{notice.body}</span>
                        <span className="resource-link">
                          Read announcement <Icon name="Arrow" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="panel compact-empty">
                    <EmptyState
                      icon="Announcements"
                      title="No announcements yet"
                    >
                      Community news will appear here.
                    </EmptyState>
                  </div>
                )
              }
            </Result>
          </section>
        </div>
        <div className="dashboard-rail">
          <section className="panel profile-strength-card">
            <span className="eyebrow">YOUR PLACE IN THE NETWORK</span>
            <h2>A profile worth finding</h2>
            <p>Help classmates and future connections get to know you.</p>
            <div className="completion-row">
              <span>Profile completion</span>
              <strong>{completion}%</strong>
            </div>
            <progress aria-label="Profile completion" max="100" value={completion}>
              {completion}%
            </progress>
            <button className="text-button" onClick={() => navigate('Profile')}>
              Update your profile <Icon name="Arrow" />
            </button>
          </section>
          <section className="panel mentor-preview">
            <BlockHeading
              title="Meet a mentor"
              onClick={() => navigate('Mentors')}
            />
            <Result result={mentors}>
              {(items) =>
                items.length ? (
                  items.slice(0, 3).map((person) => (
                    <button
                      key={person.id}
                      className="mentor-row"
                      onClick={() => navigate('Mentors')}
                    >
                      <span className="avatar">{initials(person.name)}</span>
                      <span>
                        <strong>{person.name}</strong>
                        <small>
                          Class of {person.batch} · {person.mentorTopic}
                        </small>
                      </span>
                      <Icon name="Arrow" />
                    </button>
                  ))
                ) : (
                  <EmptyState icon="Mentors" title="No mentors available">
                    Alumni offering their time will appear here.
                  </EmptyState>
                )
              }
            </Result>
          </section>
        </div>
      </div>
      <section className="campus-story">
        <CampusImage id="community" />
        <div>
          <span className="eyebrow">THE THREAD THAT CONNECTS US</span>
          <h2>
            More than a university.
            <br />A meeting of cultures.
          </h2>
          <p>
            A look back at a joint Independence Day celebration by Indian and
            Pakistani students at SAU in 2013.
          </p>
          <button className="text-button" onClick={() => navigate('Gallery')}>
            Explore campus & community <Icon name="Arrow" />
          </button>
          <PhotoCredit id="community" />
        </div>
      </section>
    </>
  )
}

export function EventPreview({
  event,
  onClick,
}: {
  event: EventItem
  onClick: () => void
}) {
  const date = new Date(event.startsAt)
  return (
    <button className="event-card panel" onClick={onClick}>
      <div className="event-card-top">
        <span className="event-date">
          <b>{date.getDate()}</b>
          <small>
            {new Intl.DateTimeFormat(undefined, { month: 'short' }).format(
              date,
            )}
          </small>
        </span>
        <span className="status-badge">
          {event.kind === 'reunion'
            ? 'Alumni gathering'
            : 'Mentor office hours'}
        </span>
      </div>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <span className="event-card-meta">
        <Icon name="Location" />
        {event.venue}
      </span>
      <span className="event-card-bottom">
        <span>
          {date > new Date()
            ? event.available + ' seats available'
            : 'Past event'}
        </span>
        <span className="resource-link">
          View details <Icon name="Arrow" />
        </span>
      </span>
    </button>
  )
}

export function CommunitySection({
  tab,
  navigate,
  version = 0,
  chat,
  memberId,
}: {
  tab: string
  navigate: (tab: string) => void
  version?: number
  chat?: (id: number) => void
  memberId?: number
}) {
  if (tab === 'Gallery') return <PhotoGallery />
  const careers = tab === 'Careers'
  return (
    <>
      <PageHeading
        eyebrow={careers ? 'YOUR NEXT CHAPTER' : 'GIVE SOMETHING BACK'}
        title={careers ? 'Career opportunities' : 'Donations'}
        description={
          careers
            ? 'Move forward with the knowledge and connections of your community.'
            : 'Support the people and ideas that make our community stronger.'
        }
      />
      {careers && <CareerListings version={version} chat={chat} memberId={memberId} />}
      <section className="resource-feature panel">
        <div>
          <span className="eyebrow">
            {careers ? 'LEARNING THAT CONTINUES' : 'KNOWLEDGE IS A GIFT'}
          </span>
          <h2>
            {careers
              ? 'A conversation can open a door.'
              : 'Your experience can make a difference.'}
          </h2>
          <p>
            {careers
              ? 'Find an alumni mentor, join an office hour, or explore the university’s professional resources.'
              : 'Offer guidance to another alumnus. Add a mentoring topic to your profile and make yourself discoverable.'}
          </p>
          <button onClick={() => navigate(careers ? 'Mentors' : 'Profile')}>
            {careers ? 'Explore mentors' : 'Offer your time'}
            <Icon name="Arrow" />
          </button>
        </div>
        <CampusImage id="library" />
        <PhotoCredit id="library" />
      </section>
      <div className="resource-pair">
        <a
          className="panel resource-card"
          href={
            careers
              ? 'https://sau.int/placements/'
              : 'https://sau.int/about/alumni-association/'
          }
          target="_blank"
          rel="noreferrer"
        >
          <Icon name={careers ? 'Careers' : 'Donations'} />
          <h2>
            {careers
              ? 'SAU training & placements'
              : 'Alumni Association of SAU'}
          </h2>
          <p>
            {careers
              ? 'Visit the university’s training and placement resources.'
              : 'Read the association’s aims and ways of supporting the university.'}
          </p>
          <span className="resource-link">
            Visit university resource <Icon name="Arrow" />
          </span>
        </a>
        <button
          className="panel resource-card"
          onClick={() => navigate('Events')}
        >
          <Icon name="Events" />
          <h2>Meet. Learn. Reconnect.</h2>
          <p>Discover upcoming alumni gatherings and mentor sessions.</p>
          <span className="resource-link">
            Browse events <Icon name="Arrow" />
          </span>
        </button>
      </div>
      <div className="source-note">
        {careers
          ? 'Explore opportunities shared by alumni businesses and the university’s professional resources.'
          : 'For financial contributions, contact the university through its official channels. This portal currently supports volunteering through mentoring.'}
      </div>
    </>
  )
}

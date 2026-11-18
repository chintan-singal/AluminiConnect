import { useState } from 'react'
import { EmptyState, Icon } from './ui'
import { EventPreview } from './Portal'
import { PageHeading, CampusImage, PhotoCredit, Modal } from './Institution'
import {
  api,
  day,
  when,
  useData,
  Result,
  type Run,
  type Booking,
  type EventItem,
} from './shared'
export function EventDetail({
  id,
  version,
  run,
  memberId,
}: {
  id: number
  version: number
  run: Run
  memberId?: number
}) {
  const result = useData<EventItem>('/events/' + id, version)
  async function act(booking: Booking, intent: string) {
    await run(async () => {
      await api('/events/' + id + '/rsvp', 'PUT', {
        intent,
        expectedRevision: booking.revision,
      })
    })
  }
  return (
    <Result result={result}>
      {(event) => {
        const b = event.booking,
          active = b.status === 'confirmed' || b.status === 'waitlisted'
        return (
          <article className="detail">
            <span className="kicker">
              {event.kind === 'reunion' ? 'Reunion' : 'Mentor office hours'}
            </span>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <p>
              {when(event.startsAt)} · {event.venue}
              {event.mentorName && ' · ' + event.mentorName}
            </p>
            <strong>
              {event.mentorId === memberId && memberId ? 'You are hosting this session' : active
                ? b.status === 'confirmed'
                  ? 'Seat confirmed'
                  : 'Waitlist position ' + b.queuePosition
                : event.available +
                  ' of ' +
                  event.capacity +
                  ' seats available'}
            </strong>
            {new Date(event.startsAt) > new Date() && (!memberId || event.mentorId !== memberId) && (
              <>
                <p>
                  When all seats are taken, joining puts you on the waitlist.
                  The next free seat goes to the first person waiting.
                </p>
                <button onClick={() => act(b, active ? 'leave' : 'join')}>
                  {active
                    ? b.status === 'confirmed'
                      ? 'Release my seat'
                      : 'Leave waitlist'
                    : 'Reserve or join waitlist'}
                </button>
              </>
            )}
          </article>
        )
      }}
    </Result>
  )
}
export function Programme({
  version,
  run,
  initialMentor,
  memberId,
}: {
  version: number
  run: Run
  initialMentor: number | null
  memberId?: number
}) {
  const [kind, setKind] = useState(''),
    [selected, select] = useState<number | null>(null),
    [period, setPeriod] = useState('upcoming'),
    [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page) })
  if (kind) params.set('kind', kind)
  if (initialMentor) params.set('mentorId', String(initialMentor))
  params.set('period', period)
  const events = useData<EventItem[]>('/events?' + params, version)
  return (
    <>
      <PageHeading
        eyebrow="BETTER WHEN WE COME TOGETHER"
        title={initialMentor ? 'Mentor sessions' : 'Events & reunions'}
        description={initialMentor ? 'Choose a published session to book a seat. Full sessions offer an ordered waitlist.' : 'Return to campus, join a conversation, or learn from an alumni mentor.'}
      />
      {!initialMentor && <div className="event-campus-banner">
        <CampusImage priority />
        <div>
          <h2>Some connections deserve a little time.</h2>
          <p>South Asian University · Maidan Garhi</p>
          <PhotoCredit />
        </div>
      </div>}
      <div
        className="filters period-filters"
        role="group"
        aria-label="Event period"
      >
        {[
          ['upcoming', 'Upcoming events'],
          ['past', 'Past events'],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={period === value}
            onClick={() => {
              setPeriod(value)
              setPage(1)
              select(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        <div>
          <div className="filters">
            {[
              ['', 'All gatherings'],
              ['reunion', 'Reunions'],
              ['office_hours', 'Office hours'],
            ].map(([value, label]) => (
              <button
                key={label}
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value)
                  setPage(1)
                  select(null)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Result result={events}>
            {(items) => (
              <>
                <div className="events-grid">
                  {items.map((e) => (
                    <EventPreview
                      key={e.id}
                      event={e}
                      onClick={() => select(e.id)}
                    />
                  ))}
                  {!items.length && (
                    <div className="panel full-width">
                      <EmptyState
                        icon="Events"
                        title={
                          period === 'past'
                            ? 'No past events'
                            : 'No upcoming events'
                        }
                      >
                        {period === 'past'
                          ? 'Past gatherings will appear here.'
                          : 'No upcoming gatherings match this view.'}
                      </EmptyState>
                    </div>
                  )}
                </div>
                <div className="pagination">
                  {page > 1 && (
                    <button onClick={() => setPage(page - 1)}>
                      Previous page
                    </button>
                  )}
                  {items.length === 30 && (
                    <button onClick={() => setPage(page + 1)}>Next page</button>
                  )}
                </div>
              </>
            )}
          </Result>
          {selected && (
            <Modal title="Booking details" onClose={() => select(null)}>
              <EventDetail id={selected} version={version} run={run} memberId={memberId} />
            </Modal>
          )}
        </div>
      </div>
    </>
  )
}
export function Schedule({ version, run, memberId }: { version: number; run: Run; memberId?: number }) {
  const result = useData<(EventItem & Booking)[]>('/me/bookings', version)
  const [id, select] = useState<number | null>(null)
  return (
    <>
      <PageHeading
        eyebrow="MAKE TIME FOR YOUR COMMUNITY"
        title="My schedule"
        description="Your confirmed seats, waitlist positions, and past gatherings."
      />
      <Result result={result}>
        {(items) => (
          <>
            {items.length === 0 && (
              <div className="panel">
                <EmptyState icon="Schedule" title="Your calendar is open">
                  Your bookings will appear here once you join a gathering.
                </EmptyState>
              </div>
            )}
            {items.map((e) => (
              <button
                className="agenda"
                key={e.id}
                onClick={() => select(e.id)}
              >
                <span className="date">{day(e.startsAt)}</span>
                <span>
                  <strong>{e.title}</strong>
                  <small>
                    {e.status}
                    {e.queuePosition
                      ? ' · position ' + e.queuePosition
                      : ''} · {e.venue}
                  </small>
                </span>
              </button>
            ))}
          </>
        )}
      </Result>
      {id && <Modal title="Booking details" onClose={() => select(null)}><EventDetail id={id} version={version} run={run} memberId={memberId} /></Modal>}
    </>
  )
}

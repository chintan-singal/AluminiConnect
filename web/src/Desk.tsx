import { useState } from 'react'
import { PageHeading } from './Institution'
import {
  api,
  fields,
  useData,
  Result,
  Section,
  type Run,
  type Member,
  type EventItem,
} from './shared'
export function Desk({ version, run }: { version: number; run: Run }) {
  const pending = useData<(Member & { email: string })[]>(
    '/applications',
    version,
  )
  const events = useData<EventItem[]>('/events', version)
  const [selected, select] = useState<number | null>(null),
    [kind, setKind] = useState('reunion')
  return (
    <>
      <PageHeading
        eyebrow="COMMUNITY STEWARDSHIP"
        title="Organizer desk"
        description="Welcome new members and create space for your community to connect."
      />
      <div className="layout">
        <div>
          <Section title="Applications">
            <Result result={pending}>
              {(list) => (
                <>
                  {!list.length && <p>No applications awaiting review.</p>}
                  {list.map((m) => (
                    <article key={m.id}>
                      <strong>
                        {m.name} · {m.batch}
                      </strong>
                      <p>{m.email}</p>
                      {['approved', 'declined'].map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            run(async () => {
                              await api('/applications/' + m.id, 'PATCH', {
                                status,
                              })
                            })
                          }
                        >
                          {status === 'approved' ? 'Approve' : 'Decline'}
                        </button>
                      ))}
                    </article>
                  ))}
                </>
              )}
            </Result>
          </Section>
          <Section title="Publish a gathering">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget,
                  d = fields(form)
                void run(async () => {
                  await api('/events', 'POST', {
                    ...d,
                    capacity: Number(d.capacity),
                    startsAt: new Date(d.startsAt).toISOString(),
                    mentorId: d.mentorId ? Number(d.mentorId) : undefined,
                  })
                  form.reset()
                  setKind('reunion')
                })
              }}
            >
              <label>
                Title
                <input name="title" required maxLength={160} />
              </label>
              <label>
                Description
                <textarea name="description" required maxLength={4000} />
              </label>
              <label>
                Type
                <select
                  name="kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="reunion">Reunion</option>
                  <option value="office_hours">Office hours</option>
                </select>
              </label>
              {kind === 'office_hours' && <MentorField version={version} />}
              <label>
                Starts in your local time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Venue
                <input name="venue" required />
              </label>
              <label>
                Seats
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="10000"
                  required
                />
              </label>
              <button>Publish gathering</button>
            </form>
          </Section>
        </div>
        <aside>
          <Section title="Post a bulletin">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                void run(async () => {
                  await api('/announcements', 'POST', fields(form))
                  form.reset()
                })
              }}
            >
              <label>
                Title
                <input name="title" required />
              </label>
              <label>
                Announcement
                <textarea name="body" required maxLength={50000} />
              </label>
              <button>Publish announcement</button>
            </form>
          </Section>
          <Section title="Attendance">
            <Result result={events}>
              {(items) => (
                <select
                  aria-label="Choose gathering"
                  value={selected || ''}
                  onChange={(e) => select(Number(e.target.value) || null)}
                >
                  <option value="">Choose gathering</option>
                  {items.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              )}
            </Result>
            {selected && <Roster id={selected} version={version} />}
          </Section>
        </aside>
      </div>
    </>
  )
}
function MentorField({ version }: { version: number }) {
  const mentors = useData<Member[]>('/members?mentor=true', version)
  return (
    <Result result={mentors}>
      {(list) => (
        <label>
          Host
          <select name="mentorId" required defaultValue="">
            <option value="">Choose a mentor</option>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </Result>
  )
}
export function Roster({ id, version }: { id: number; version: number }) {
  const result = useData<{ id: number; name: string; status: string }[]>(
    '/events/' + id + '/roster',
    version,
  )
  return (
    <Result result={result}>
      {(items) =>
        items.length ? (
          <ol>
            {items.map((m) => (
              <li key={m.id}>
                {m.name} · {m.status}
              </li>
            ))}
          </ol>
        ) : (
          <p>No reservations yet.</p>
        )
      }
    </Result>
  )
}

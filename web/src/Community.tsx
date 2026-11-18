import { useState } from 'react'
import { Appearance } from './Theme'
import { MentoringTools } from './Mentoring'
import { EmptyState, Icon, initials } from './ui'
import { PageHeading, Modal } from './Institution'
import {
  api,
  fields,
  useData,
  Result,
  type Member,
  type Run,
  type Page,
  type Message,
  Section,
} from './shared'
export function People({
  version,
  me,
  chat,
  mentor,
  mentorsOnly = false,
  member,
  profile,
}: {
  version: number
  me: number
  chat: (id: number) => void
  mentor: (id: number) => void
  mentorsOnly?: boolean
  member?: Member
  profile?: () => void
}) {
  const [q, setQ] = useState(''),
    [batch, setBatch] = useState(''),
    [city, setCity] = useState(''),
    [field, setField] = useState(''),
    [selected, setSelected] = useState<Member | null>(null),
    [only, setOnly] = useState(mentorsOnly),
    [page, setPage] = useState(1)
  const params = new URLSearchParams({ q, page: String(page) })
  if (batch) params.set('batch', batch)
  if (city) params.set('city', city)
  if (field) params.set('field', field)
  if (only) params.set('mentor', 'true')
  const result = useData<Member[]>('/members?' + params, version)
  return (
    <>
      <PageHeading
        eyebrow={mentorsOnly ? 'KNOWLEDGE SHARED' : 'THE PEOPLE WHO MAKE US'}
        title={mentorsOnly ? 'Mentors Hub' : 'Alumni directory'}
        description={
          mentorsOnly
            ? 'Experience, perspective, and a little guidance for what comes next.'
            : 'Find familiar faces and new connections across your alumni community.'
        }
      />
      {mentorsOnly && member && profile && <MentoringTools member={member} version={version} profile={profile} />}
      <div className="filters directory-filters panel">
        <label>
          Name
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label>
          Location
          <input
            value={city}
            placeholder="City or region"
            maxLength={100}
            onChange={(event) => {
              setCity(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label>
          Professional field
          <input
            value={field}
            placeholder="Research, law, technology…"
            maxLength={120}
            onChange={(event) => {
              setField(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label>
          Batch
          <input
            type="number"
            value={batch}
            onChange={(e) => {
              setBatch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        {!mentorsOnly && (
          <label>
            <input
              type="checkbox"
              checked={only}
              onChange={(e) => {
                setOnly(e.target.checked)
                setPage(1)
              }}
            />{' '}
            Mentors only
          </label>
        )}
      </div>
      <Result result={result}>
        {(list) => (
          <>
            <div className="people-grid">
              {list.map((m) => (
                <article className="panel person-card" key={m.id}>
                  <div className="person-heading">
                    <span className="avatar">{initials(m.name)}</span>
                    <div>
                      <small>Class of {m.batch}</small>
                      <h3>{m.name}</h3>
                    </div>
                  </div>
                  <p>
                    {[m.city, m.field, m.mentorTopic]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="card-actions">
                    <button
                      className="text-button"
                      onClick={() => setSelected(m)}
                    >
                      View profile <Icon name="Arrow" />
                    </button>
                    {m.id !== me && (
                      <button className="secondary" onClick={() => chat(m.id)}>
                        Message {m.name}
                      </button>
                    )}
                    {m.mentorTopic && (
                      <button onClick={() => mentor(m.id)}>
                        View office hours
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!list.length && (
              <div className="panel">
                <EmptyState
                  icon={mentorsOnly ? 'Mentors' : 'People'}
                  title={
                    mentorsOnly ? 'No matching mentors' : 'No matching alumni'
                  }
                >
                  Try another name or graduation year.
                </EmptyState>
              </div>
            )}
            {page > 1 && (
              <button onClick={() => setPage(page - 1)}>Previous page</button>
            )}
            {list.length === 30 && (
              <button onClick={() => setPage(page + 1)}>Next page</button>
            )}
          </>
        )}
      </Result>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="member-dialog">
            <span className="avatar avatar-large">
              {initials(selected.name)}
            </span>
            <span className="member-status">Alumni community</span>
            <dl>
              <div>
                <dt>Graduation year</dt>
                <dd>{selected.batch}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{selected.city || 'Not added'}</dd>
              </div>
              <div>
                <dt>Professional field</dt>
                <dd>{selected.field || 'Not added'}</dd>
              </div>
              {selected.mentorTopic && (
                <div>
                  <dt>Mentoring</dt>
                  <dd>{selected.mentorTopic}</dd>
                </div>
              )}
            </dl>
            <div className="card-actions">
              {selected.id !== me && (
                <button
                  onClick={() => {
                    setSelected(null)
                    chat(selected.id)
                  }}
                >
                  Message {selected.name}
                </button>
              )}
              {selected.mentorTopic && (
                <button
                  className="secondary"
                  onClick={() => {
                    setSelected(null)
                    mentor(selected.id)
                  }}
                >
                  View office hours
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
function Thread({
  peer,
  version,
  me,
  run,
}: {
  peer: number
  version: number
  me: number
  run: Run
}) {
  const [cursor, setCursor] = useState('')
  const data = useData<Page<Message>>(
    '/messages/' + peer + (cursor ? '?before=' + cursor : ''),
    version,
  )
  const latest = data.data?.items[0]
  const name =
    latest &&
    (latest.senderId === peer ? latest.senderName : latest.recipientName)
  return (
    <Section title={name || 'Your conversation'}>
      <Result result={data}>
        {(list) => (
          <>
            {list.next && (
              <button onClick={() => setCursor(list.next!)}>
                Older messages
              </button>
            )}
            {cursor && (
              <button onClick={() => setCursor('')}>Latest messages</button>
            )}
            {[...list.items].reverse().map((m) => (
              <p className="body" key={m._id}>
                <b>
                  {m.senderId === me ? 'You' : m.senderName || 'Alumni member'}
                </b>
                <br />
                {m.body}
              </p>
            ))}
          </>
        )}
      </Result>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          void run(async () => {
            await api('/messages/' + peer, 'POST', fields(form))
            form.reset()
            setCursor('')
          })
        }}
      >
        <label>
          Message
          <textarea name="body" required maxLength={32000} />
        </label>
        <button>Send message</button>
      </form>
    </Section>
  )
}
export function Messages({
  version,
  me,
  initial,
  run,
}: {
  version: number
  me: number
  initial: number | null
  run: Run
}) {
  const [peer, setPeer] = useState(initial),
    [page, setPage] = useState(1)
  const inbox = useData<{ _id: string; last: Message }[]>(
    '/messages?page=' + page,
    version,
  )
  return (
    <>
      <PageHeading
        eyebrow="KEEP IN TOUCH"
        title="Messenger"
        description="A conversation can be the start of something good."
      />
      <div className="messenger-layout panel">
        <div className="conversation-list">
          <Result result={inbox}>
            {(list) => (
              <>
                {list.map((t) => {
                  const id =
                    t.last.senderId === me
                      ? t.last.recipientId
                      : t.last.senderId
                  return (
                    <button
                      className="agenda"
                      key={id}
                      onClick={() => setPeer(id)}
                    >
                      <strong>
                        {(t.last.senderId === me
                          ? t.last.recipientName
                          : t.last.senderName) || 'Alumni member'}
                      </strong>
                      <small>{t.last.body.slice(0, 70)}</small>
                    </button>
                  )
                })}
                {!list.length && (
                  <EmptyState icon="Messenger" title="No conversations yet">
                    Start a conversation from the alumni directory.
                  </EmptyState>
                )}
                {page > 1 && (
                  <button onClick={() => setPage(page - 1)}>
                    Previous page
                  </button>
                )}
                {list.length === 30 && (
                  <button onClick={() => setPage(page + 1)}>Next page</button>
                )}
              </>
            )}
          </Result>
        </div>
        <div className="conversation-detail">
          {peer && (
            <Thread
              key={peer}
              peer={peer}
              version={version}
              me={me}
              run={run}
            />
          )}
          {!peer && (
            <EmptyState icon="Messenger" title="Your messages">
              Select a conversation to pick up where you left off.
            </EmptyState>
          )}
        </div>
      </div>
    </>
  )
}
export function Profile({
  member,
  run,
  refresh,
}: {
  member: Member
  run: Run
  refresh: () => Promise<void>
}) {
  return (
    <>
      <PageHeading
        eyebrow="YOUR ALUMNI IDENTITY"
        title="My profile"
        description="Let your community know where life has taken you."
      />
      <section className="profile-summary panel">
        <span className="avatar avatar-large">{initials(member.name)}</span>
        <div>
          <span className="member-status">Verified member</span>
          <h2>{member.name}</h2>
          <p>
            Class of {member.batch}
            {member.city && ' · ' + member.city}
          </p>
          {member.field && <small>{member.field}</small>}
          {member.email && <p>{member.email}</p>}
        </div>
      </section>
      <div className="profile-layout">
        <section className="panel profile-details">
          <h2>
            <Icon name="Profile" />
            Personal & professional details
          </h2>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault()
              const data = fields(e.currentTarget)
              void run(async () => {
                await api('/me', 'PATCH', {
                  ...data,
                  visible: data.visible === 'on',
                })
                await refresh()
              })
            }}
          >
            <div className="form-grid">
              {(['name', 'city', 'field', 'mentorTopic'] as const).map((k) => (
                <label key={k}>
                  {
                    {
                      name: 'Name',
                      city: 'City',
                      field: 'Professional field',
                      mentorTopic: 'Mentoring topic',
                    }[k]
                  }
                  <input
                    name={k}
                    defaultValue={member[k]}
                    required={k === 'name'}
                  />
                </label>
              ))}
            </div>
            <label>
              <input
                name="visible"
                type="checkbox"
                defaultChecked={!!member.visible}
              />{' '}
              List me in the directory so alumni can contact me
            </label>
            <div>
              <button>Save profile</button>
            </div>
          </form>
        </section>
        <Appearance />
      </div>
    </>
  )
}

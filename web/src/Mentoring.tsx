import { useState } from 'react'
import { api, fields, Result, useData, when, type EventItem, type Member } from './shared'
import { Modal } from './Institution'
import { Roster } from './Desk'

export function MentoringTools({ member, version, profile }: {
  member: Member
  version: number
  profile: () => void
}) {
  if (!member.visible || !member.mentorTopic) return (
    <section className="panel section-panel mentoring-tools">
      <h2>Share your experience</h2>
      <p>Add a mentoring topic and enable directory visibility to publish your own office hours.</p>
      <button onClick={profile}>Set up mentoring</button>
    </section>
  )
  return <PublishedSessions member={member} version={version} />
}

function PublishedSessions({ member, version }: { member: Member; version: number }) {
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [revision, bump] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const events = useData<EventItem[]>('/events?kind=office_hours&mentorId=' + member.id, version + revision)
  return (
    <section className="panel section-panel mentoring-tools">
      <div className="listing-toolbar">
        <div><h2>My office hours</h2><p>Publish a time for alumni to book. Use one seat for a one-to-one session.</p></div>
        <button onClick={() => { setError(''); setCreating(true) }}>Publish office hours</button>
      </div>
      <Result result={events}>{(items) => <>
        {!items.length && <p>Your published sessions will appear here.</p>}
        {items.map((event) => <div className="hosted-session" key={event.id}>
          <div><strong>{event.title}</strong><small>{when(event.startsAt)} · {event.available} seats available</small></div>
          <button className="secondary" onClick={() => setSelected(event)}>Attendees for {event.title}</button>
        </div>)}
      </>}</Result>
      {selected && <Modal title={'Attendees · ' + selected.title} onClose={() => setSelected(null)}>
        <div className="job-details"><Roster id={selected.id} version={version + revision} /></div>
      </Modal>}
      {creating && <Modal title="Publish office hours" onClose={() => setCreating(false)}>
        <form className="job-editor" onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          const values = fields(event.currentTarget)
          setBusy(true)
          setError('')
          try {
            await api('/mentor-sessions', 'POST', {
              ...values, capacity: Number(values.capacity), startsAt: new Date(values.startsAt).toISOString(),
            })
            setCreating(false)
            bump((value) => value + 1)
          } catch (failure) {
            setError((failure as Error).message)
          } finally {
            setBusy(false)
          }
        }}>
          <fieldset disabled={busy}>
            <label>Session title<input name="title" required maxLength={160} defaultValue={member.mentorTopic} /></label>
            <label>Session description<textarea name="description" required maxLength={4000} /></label>
            <label>Starts in your local time<input name="startsAt" type="datetime-local" required /></label>
            <label>Meeting location or link<input name="venue" required maxLength={180} /></label>
            <label>Seats<input name="capacity" type="number" min="1" max="10000" required defaultValue={1} /></label>
            {error && <p role="alert">{error}</p>}
            <button>{busy ? 'Publishing…' : 'Publish session'}</button>
          </fieldset>
        </form>
      </Modal>}
    </section>
  )
}

import { useState } from 'react'
import { api, fields, Result, useData, type Job } from './shared'
import { Modal } from './Institution'
import { EmptyState, Icon } from './ui'

const jobTypes: Record<string, string> = {
  full_time: 'Full-time', internship: 'Internship', contract: 'Contract',
}

export function CareerListings({ version, chat, memberId }: {
  version: number
  chat?: (id: number) => void
  memberId?: number
}) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [mine, setMine] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Job | null>(null)
  const [editor, setEditor] = useState<{ job?: Job } | null>(null)
  const [revision, bump] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const params = new URLSearchParams({ q: query, location, page: String(page) })
  if (type) params.set('type', type)
  if (mine) params.set('mine', 'true')
  const jobs = useData<Job[]>('/jobs?' + params, version + revision)

  async function changeStatus(job: Job) {
    setBusy(true)
    setError('')
    try {
      await api('/jobs/' + job._id, 'PATCH', { status: job.status === 'closed' ? 'open' : 'closed' })
      setSelected(null)
      bump((value) => value + 1)
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="career-listings" aria-label="Alumni opportunities">
      {memberId && <div className="listing-toolbar">
        <div className="filters" role="group" aria-label="Opportunity view">
          {['All opportunities', 'My postings'].map((label, index) => (
            <button key={label} aria-pressed={mine === Boolean(index)} onClick={() => {
              setMine(Boolean(index))
              setPage(1)
            }}>{label}</button>
          ))}
        </div>
        <button onClick={() => setEditor({})}>Post an opportunity <Icon name="Careers" /></button>
      </div>}
      <div className="panel career-filters">
        <label>Search opportunities
          <input value={query} placeholder="Role, company or field" maxLength={120}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
        </label>
        <label>Job location
          <input value={location} placeholder="City or Remote" maxLength={100}
            onChange={(event) => { setLocation(event.target.value); setPage(1) }} />
        </label>
        <label>Employment type
          <select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}>
            <option value="">All types</option>
            {Object.entries(jobTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>
      <Result result={jobs}>
        {(items) => <>
          <div className="career-grid">
            {items.map((job) => (
              <article className="panel career-card" key={job._id}>
                <div className="career-card-top">
                  <span className="status-badge">{jobTypes[job.type]}</span>
                  {job.status === 'closed' && <span className="status-badge">Closed</span>}
                </div>
                <h2>{job.title}</h2>
                <strong>{job.company}</strong>
                <p className="career-location"><Icon name="Location" />{job.location} · {job.workMode}</p>
                <div className="academic-tags">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <p className="career-salary">{job.salaryRange}</p>
                <div className="career-card-bottom">
                  <small>Shared by {job.posterName}</small>
                  <button className="text-button" onClick={() => { setError(''); setSelected(job) }} aria-label={'View ' + job.title}>
                    View opportunity <Icon name="Arrow" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!items.length && <EmptyState icon="Careers" title="No matching opportunities">
            Try another role, location or employment type.
          </EmptyState>}
          <div className="pagination">
            {page > 1 && <button onClick={() => setPage(page - 1)}>Previous page</button>}
            {items.length === 30 && <button onClick={() => setPage(page + 1)}>Next page</button>}
          </div>
        </>}
      </Result>
      {selected && <Modal title={selected.title} onClose={() => setSelected(null)}>
        <div className="job-details">
          <p><strong>{selected.company}</strong> · {selected.location} · {selected.workMode}</p>
          <p>{selected.description}</p>
          <div className="academic-tags">{selected.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <p>{selected.salaryRange}</p>
          <p>Closes {new Date(selected.closesAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
          <p>{selected.posterId === memberId ? 'You shared this opportunity.' : 'Shared by ' + selected.posterName}</p>
          {error && <p role="alert">{error}</p>}
          <div className="card-actions">
            {selected.posterId === memberId && <>
              <button onClick={() => { setEditor({ job: selected }); setSelected(null) }}>Edit opportunity</button>
              <button className="secondary" disabled={busy} onClick={() => void changeStatus(selected)}>
                {selected.status === 'closed' ? 'Reopen listing' : 'Close listing'}
              </button>
            </>}
            {chat && selected.posterId !== memberId && <button onClick={() => {
              const id = selected.posterId
              setSelected(null)
              chat(id)
            }}>Message alumnus <Icon name="Messenger" /></button>}
          </div>
        </div>
      </Modal>}
      {editor && <JobEditor job={editor.job} close={() => setEditor(null)} saved={() => {
        setEditor(null)
        setMine(true)
        setPage(1)
        setQuery('')
        setLocation('')
        setType('')
        bump((value) => value + 1)
      }} />}
    </section>
  )
}

function JobEditor({ job, close, saved }: { job?: Job; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const date = new Date(job?.closesAt || Date.now() + 30 * 86400000)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  return <Modal title={job ? 'Edit opportunity' : 'Post an opportunity'} onClose={close}>
    <form className="job-editor" onSubmit={async (event) => {
      event.preventDefault()
      if (busy) return
      const values = fields(event.currentTarget)
      setBusy(true)
      setError('')
      try {
        await api(job ? '/jobs/' + job._id : '/jobs', job ? 'PATCH' : 'POST', {
          ...values, skills: values.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
          businessOwner: values.businessOwner === 'on', closesAt: new Date(values.closesAt).toISOString(),
        })
        saved()
      } catch (failure) {
        setError((failure as Error).message)
      } finally {
        setBusy(false)
      }
    }}>
      <fieldset disabled={busy}>
        <label>Role title<input name="title" required maxLength={160} defaultValue={job?.title} /></label>
        <label>Business name<input name="company" required maxLength={120} defaultValue={job?.company} /></label>
        <div className="form-pair">
          <label>Location<input name="location" required maxLength={100} defaultValue={job?.location} /></label>
          <label>Professional field<input name="field" required maxLength={120} defaultValue={job?.field} /></label>
          <label>Work arrangement<select name="workMode" defaultValue={job?.workMode || 'Hybrid'}>
            {['Hybrid', 'Remote', 'On-site'].map((mode) => <option key={mode}>{mode}</option>)}
          </select></label>
          <label>Job type<select name="type" defaultValue={job?.type || 'full_time'}>
            {Object.entries(jobTypes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>
        </div>
        <label>Role description<textarea name="description" required maxLength={8000} defaultValue={job?.description} /></label>
        <label>Skills, separated by commas<input name="skills" required maxLength={610} defaultValue={job?.skills.join(', ')} /></label>
        <label>Compensation<input name="salaryRange" required maxLength={120} defaultValue={job?.salaryRange} /></label>
        <label>Applications close in your local time<input name="closesAt" type="datetime-local" required defaultValue={localDate} /></label>
        <label className="check"><input name="businessOwner" type="checkbox" required defaultChecked={Boolean(job)} />I own or represent this business and am authorised to share this role.</label>
        {error && <p role="alert">{error}</p>}
        <button>{busy ? 'Saving…' : job ? 'Save changes' : 'Publish opportunity'}</button>
      </fieldset>
    </form>
  </Modal>
}

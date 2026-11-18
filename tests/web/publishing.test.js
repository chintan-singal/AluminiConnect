const React = require('react')
const { render, screen, fireEvent, waitFor, cleanup } = require('@testing-library/react')
const { CareerListings } = require('../../web/src/Careers')
const { MentoringTools } = require('../../web/src/Mentoring')
const { Programme, Schedule, EventDetail } = require('../../web/src/Programme')
const h = React.createElement
const member = { id: 7, name: 'Graduate', visible: 1, mentorTopic: 'Engineering', batch: 2020 }
const session = { id: 9, title: 'Career guidance', kind: 'office_hours', mentorId: 7, startsAt: '2099-01-01T10:00:00Z', venue: 'Online', capacity: 1, available: 1, description: 'A focused conversation', booking: { status: 'none', revision: 0 } }
function reply(body, status = 200) { return { ok: status < 400, status, json: async () => body } }
function fill(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
})

test('alumni publish, edit, close and reopen opportunities with recoverable save errors', async () => {
  let job
  let failPost = true
  let failStatus = true
  global.fetch = jest.fn(async (url, init) => {
    const body = init?.body && JSON.parse(init.body)
    if (init?.method === 'POST' && failPost) { failPost = false; return reply({ code: 'SERVICE_UNAVAILABLE' }, 503) }
    if (init?.method === 'POST') { job = { ...body, _id: '1', posterId: 7, posterName: 'Graduate', status: 'open' }; return reply(job, 201) }
    if (init?.method === 'PATCH') {
      if (body.status && failStatus) { failStatus = false; return reply({ code: 'SERVICE_UNAVAILABLE' }, 503) }
      job = { ...job, ...body }
      return reply(job)
    }
    return reply(job ? [job] : [])
  })
  render(h(CareerListings, { version: 0, memberId: 7 }))
  fireEvent.click(screen.getByRole('button', { name: 'Post an opportunity' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Post an opportunity' }))
  for (const [label, value] of Object.entries({
    'Role title': 'API Engineer', 'Business name': 'Graduate Labs', Location: 'Delhi',
    'Professional field': 'Software', 'Role description': 'Build APIs',
    'Skills, separated by commas': 'Node.js, MySQL', Compensation: 'INR 9 lakh',
    'Applications close in your local time': '2099-01-01T10:00',
  })) fill(label, value)
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Publish opportunity' }))
  await screen.findByRole('button', { name: 'View API Engineer' })
  expect(job.businessOwner).toBe(true)
  expect(job.skills).toEqual(['Node.js', 'MySQL'])
  fireEvent.click(screen.getByRole('button', { name: 'All opportunities' }))
  fireEvent.click(screen.getByRole('button', { name: 'My postings' }))
  fireEvent.click(await screen.findByRole('button', { name: 'View API Engineer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Edit opportunity' }))
  fill('Role title', 'Senior API Engineer')
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  fireEvent.click(await screen.findByRole('button', { name: 'View Senior API Engineer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close listing' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Close listing' }))
  await screen.findByText('Closed')
  fireEvent.click(screen.getByRole('button', { name: 'View Senior API Engineer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reopen listing' }))
  await waitFor(() => expect(job.status).toBe('open'))
})

test('mentors set up their profile, publish a session, recover from errors and inspect attendees', async () => {
  const profile = jest.fn()
  const view = render(h(MentoringTools, { member: { ...member, visible: 0 }, version: 0, profile }))
  fireEvent.click(screen.getByRole('button', { name: 'Set up mentoring' }))
  expect(profile).toHaveBeenCalled()
  view.unmount()
  let published = false
  let fail = true
  global.fetch = jest.fn(async (url, init) => {
    if (init?.method === 'POST') {
      if (fail) { fail = false; return reply({ code: 'SERVICE_UNAVAILABLE' }, 503) }
      published = true
      expect(JSON.parse(init.body)).toMatchObject({ capacity: 1, venue: 'Online' })
      return reply({ id: 9 }, 201)
    }
    return reply(url.endsWith('/roster') ? [{ id: 2, name: 'Attendee', status: 'confirmed' }] : published ? [session] : [])
  })
  render(h(MentoringTools, { member, version: 0, profile }))
  await screen.findByText('Your published sessions will appear here.')
  fireEvent.click(screen.getByRole('button', { name: 'Publish office hours' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Publish office hours' }))
  fill('Session title', session.title)
  fill('Session description', session.description)
  fill('Starts in your local time', '2099-01-01T10:00')
  fill('Meeting location or link', 'Online')
  fireEvent.click(screen.getByRole('button', { name: 'Publish session' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Publish session' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Attendees for Career guidance' }))
  await screen.findByText('Attendee · confirmed')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
})

test('mentor bookings open in dialogs and hosts see their hosting state', async () => {
  global.fetch = jest.fn(async (url) => reply(url.endsWith('/9') ? session : [session]))
  render(h(Programme, { version: 0, initialMentor: 7, run: (fn) => fn(), memberId: 2 }))
  fireEvent.click(await screen.findByRole('button', { name: /Career guidance/ }))
  await screen.findByRole('button', { name: 'Reserve or join waitlist' })
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  cleanup()
  render(h(Schedule, { version: 0, run: (fn) => fn() }))
  fireEvent.click(await screen.findByRole('button', { name: /Career guidance/ }))
  await screen.findByRole('dialog')
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  cleanup()
  render(h(EventDetail, { id: 9, version: 0, run: (fn) => fn(), memberId: 7 }))
  await screen.findByText('You are hosting this session')
  expect(screen.queryByRole('button', { name: 'Reserve or join waitlist' })).toBeNull()
})

const React = require('react')
const {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} = require('@testing-library/react')
const { App } = require('../../web/src/App')
const { Programme, EventDetail, Schedule } = require('../../web/src/Programme')
const { People, Messages, Profile } = require('../../web/src/Community')
const { Desk } = require('../../web/src/Desk')
const { api, ApiError } = require('../../web/src/shared')
const { Announcements } = require('../../web/src/Portal')
const h = React.createElement
beforeEach(() => localStorage.clear())
test('member navigation opens a mentor programme, schedule, conversation and desk', async () => {
  mock((url) => {
    if (url === '/me') return [200, member]
    if (url.startsWith('/members?'))
      return [200, [{ ...member, id: 71, name: 'Mentor Lee' }]]
    if (url.startsWith('/announcements') || url.startsWith('/messages/'))
      return [200, { items: [], next: null }]
    return [200, []]
  })
  render(h(App))
  await screen.findByText('No upcoming events')
  fireEvent(window, new Event('focus'))
  fireEvent.click(screen.getByRole('button', { name: 'Alumni directory' }))
  fireEvent.click(await screen.findByText('View office hours'))
  await screen.findByText('Mentor sessions')
  fireEvent.click(screen.getByRole('button', { name: 'Alumni directory' }))
  fireEvent.click(await screen.findByText('Message Mentor Lee'))
  await screen.findByText('Your conversation')
  fireEvent.click(screen.getByRole('button', { name: 'My schedule' }))
  await screen.findByText(
    'Your bookings will appear here once you join a gathering.',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Organizer desk' }))
  await screen.findByText('No applications awaiting review.')
})
test('declined application and expired session on a user action', async () => {
  mock((url) =>
    url === '/auth/logout'
      ? [401, { code: 'SIGN_IN_REQUIRED' }]
      : [200, { ...member, status: 'declined' }],
  )
  render(h(App))
  await screen.findByText(
    'Contact the alumni office to discuss your application.',
  )
  fireEvent.click(screen.getByText('Sign out'))
  await screen.findByText('Member sign in')
  expect(screen.getByRole('alert').textContent).toContain('sign in required')
})
test('programme and bulletin pagination navigate between pages', async () => {
  const events = Array.from({ length: 30 }, (_, i) => ({
    ...event,
    id: i + 1,
    title: 'Event ' + i,
  }))
  mock((url) =>
    url.startsWith('/announcements')
      ? [200, { items: [], next: url.includes('before') ? null : 'cursor' }]
      : [200, url.includes('page=2') ? [] : events],
  )
  const view = render(h(Programme, { version: 0, run, initialMentor: null }))
  fireEvent.click(await screen.findByText('Next page'))
  fireEvent.click(await screen.findByText('Previous page'))
  await screen.findByText('Event 0')
  view.unmount()
  render(h(Announcements, { version: 0 }))
  await screen.findByText('No announcements yet')
  fireEvent.click(screen.getByText('Older notices'))
  fireEvent.click(await screen.findByText('Latest notices'))
  await screen.findByText('Older notices')
})
test('directory and inbox pagination retain filters and show outgoing messages', async () => {
  const people = Array.from({ length: 30 }, (_, i) => ({
    ...member,
    id: i + 100,
    name: 'Alum ' + i,
  }))
  mock((url) => [200, url.includes('page=2') ? [] : people])
  const view = render(
    h(People, { version: 0, me: 12, chat: jest.fn(), mentor: jest.fn() }),
  )
  fireEvent.change(screen.getByLabelText('Batch'), {
    target: { value: '2020' },
  })
  fireEvent.click(await screen.findByText('Next page'))
  fireEvent.click(await screen.findByText('Previous page'))
  await screen.findByText('Alum 0')
  view.unmount()
  const inbox = people.map((m) => ({
    _id: String(m.id),
    last: {
      _id: 'm',
      senderId: 12,
      recipientId: m.id,
      recipientName: m.name,
      body: 'Outgoing',
    },
  }))
  mock((url) =>
    url.startsWith('/messages?')
      ? [200, url.includes('page=2') ? [] : inbox]
      : [200, { items: [inbox[0].last], next: null }],
  )
  render(h(Messages, { version: 0, me: 12, initial: null, run }))
  fireEvent.click(await screen.findByText('Next page'))
  fireEvent.click(await screen.findByText('Previous page'))
  fireEvent.click(await screen.findByText('Alum 0'))
  await screen.findByText('You')
})
test('load failure and empty roster have distinct visible states', async () => {
  mock((url) =>
    url === '/events'
      ? [200, [event]]
      : url === '/applications'
        ? [503, { code: 'SERVICE_UNAVAILABLE' }]
        : [200, []],
  )
  render(h(Desk, { version: 0, run }))
  await screen.findByRole('alert')
  fireEvent.change(await screen.findByLabelText('Choose gathering'), {
    target: { value: '4' },
  })
  await screen.findByText('No reservations yet.')
})
const member = {
  id: 12,
  name: 'Asha Bose',
  batch: 2020,
  city: 'Pune',
  field: 'Design',
  mentorTopic: 'Print',
  visible: 1,
  role: 'organizer',
  status: 'approved',
}
const event = {
  id: 4,
  title: 'Class reunion',
  description: 'Meet in the studio',
  startsAt: '2099-01-01T12:00:00Z',
  kind: 'reunion',
  venue: 'Studio',
  available: 1,
  capacity: 1,
  booking: { status: 'none', revision: 0, queuePosition: null },
}
const run = (fn) => fn()
function mock(fn) {
  global.fetch = jest.fn(async (url, init) => {
    const result = fn(url.replace('/api', ''), init)
    const [status, body] = result || [200, []]
    return { ok: status >= 200 && status < 300, status, json: async () => body }
  })
}
function submit(button) {
  fireEvent.submit(button.closest('form'))
}
test('registration leads to pending review then approved programme and sign out', async () => {
  let status = 'anonymous'
  mock((url, init) => {
    if (url === '/me')
      return status === 'anonymous'
        ? [401, { code: 'SIGN_IN_REQUIRED' }]
        : [200, { ...member, status }]
    if (url === '/auth/login') {
      status = 'pending'
      return [204]
    }
    if (url === '/auth/register') return [201, { id: 12 }]
    if (url === '/auth/logout') return [204]
    if (url.startsWith('/announcements'))
      return [200, { items: [], next: null }]
  })
  render(h(App))
  fireEvent.click(await screen.findByText('New here? Apply to join'))
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Asha' },
  })
  fireEvent.change(screen.getByLabelText('Graduation year'), {
    target: { value: '2020' },
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'asha@example.test' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'example password' },
  })
  submit(screen.getByText('Submit application', { exact: false }))
  await screen.findByText('Application pending')
  status = 'approved'
  fireEvent.click(screen.getByText('Check status'))
  await screen.findByRole('heading', { name: /Welcome back/ })
  fireEvent.click(screen.getByRole('button', { name: 'Profile & settings' }))
  await screen.findByText('My profile')
  fireEvent.click(screen.getByText('Sign out'))
  await screen.findByText('Member sign in')
})
test('shows backend error and offers recovery', async () => {
  let offline = true
  mock(() =>
    offline
      ? [503, { code: 'SERVICE_UNAVAILABLE' }]
      : [401, { code: 'SIGN_IN_REQUIRED' }],
  )
  render(h(App))
  await screen.findByText('service unavailable')
  offline = false
  fireEvent.click(screen.getByText('Retry connection'))
  await screen.findByText('Member sign in')
})
test('events filter, open a gathering and submit the booked revision', async () => {
  mock((url) =>
    url.startsWith('/announcements')
      ? [
          200,
          {
            items: [
              {
                _id: 'n',
                title: 'News',
                body: 'Welcome',
                authorName: 'Office',
              },
            ],
            next: null,
          },
        ]
      : url.includes('?')
        ? [200, [event]]
        : url === '/events/4'
          ? [200, event]
          : [200, {}],
  )
  render(h(Programme, { version: 0, run, initialMentor: null }))
  fireEvent.click(await screen.findByText('Office hours'))
  fireEvent.click(await screen.findByText(event.title))
  fireEvent.click(await screen.findByText('Reserve or join waitlist'))
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events/4/rsvp',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ intent: 'join', expectedRevision: 0 }),
      }),
    ),
  )
})
test.each([
  ['confirmed', 'Release my seat'],
  ['waitlisted', 'Leave waitlist'],
])('existing %s booking releases own place', async (status, label) => {
  mock(() => [
    200,
    { ...event, booking: { status, revision: 3, queuePosition: 2 } },
  ])
  render(h(EventDetail, { id: 4, version: 0, run }))
  fireEvent.click(await screen.findByText(label))
  expect(global.fetch.mock.calls.at(-1)[1].body).toBe(
    JSON.stringify({ intent: 'leave', expectedRevision: 3 }),
  )
})
test('schedule opens a waitlisted booking', async () => {
  mock((url) =>
    url === '/me/bookings'
      ? [200, [{ ...event, status: 'waitlisted', queuePosition: 1 }]]
      : [200, event],
  )
  render(h(Schedule, { version: 0, run }))
  fireEvent.click(await screen.findByText(event.title))
  await screen.findByText('Reserve or join waitlist')
})
test('people search, mentor discovery, direct contact and profile save', async () => {
  mock(() => [200, [member]])
  const chat = jest.fn(),
    mentor = jest.fn()
  const view = render(h(People, { version: 0, me: 3, chat, mentor }))
  await screen.findByText(member.name)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha' } })
  fireEvent.click(screen.getByText('Mentors only'))
  fireEvent.click(await screen.findByText('View office hours'))
  fireEvent.click(screen.getByText('Message ' + member.name))
  expect(chat).toHaveBeenCalledWith(12)
  expect(mentor).toHaveBeenCalledWith(12)
  view.unmount()
  const refresh = jest.fn()
  render(h(Profile, { member, run, refresh }))
  submit(screen.getByText('Save profile'))
  await waitFor(() => expect(refresh).toHaveBeenCalled())
})
test('inbox opens a conversation, reads older messages and sends', async () => {
  const msg = { _id: '1', body: 'Hello', senderId: 4, recipientId: 12 }
  mock((url) =>
    url.startsWith('/messages?page')
      ? [200, [{ _id: 't', last: msg }]]
      : [200, { items: [msg], next: url.includes('?') ? null : 'aaaa' }],
  )
  render(h(Messages, { version: 0, me: 12, initial: null, run }))
  fireEvent.click(await screen.findByText('Alumni member'))
  fireEvent.click(await screen.findByText('Older messages'))
  fireEvent.click(await screen.findByText('Latest messages'))
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Hello again' },
  })
  submit(screen.getByText('Send message'))
  await waitFor(() => expect(screen.getByLabelText('Message').value).toBe(''))
})
test('organizer reviews applications, publishes an event and announcement, and inspects the roster', async () => {
  mock((url, init) =>
    init.method !== 'GET'
      ? [201, { id: 4 }]
      : url === '/applications'
        ? [200, [member]]
        : url === '/events'
          ? [200, [event]]
          : url.startsWith('/members')
            ? [200, [member]]
            : [200, [{ ...member, status: 'confirmed' }]],
  )
  render(h(Desk, { version: 0, run }))
  fireEvent.click(await screen.findByText('Approve'))
  fireEvent.change(screen.getByLabelText('Type'), {
    target: { value: 'office_hours' },
  })
  fireEvent.change(await screen.findByLabelText('Host'), {
    target: { value: 12 },
  })
  fireEvent.change(screen.getByLabelText('Starts in your local time'), {
    target: { value: '2099-01-01T12:30' },
  })
  fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '1' } })
  submit(screen.getByText('Publish gathering'))
  submit(screen.getByText('Publish announcement'))
  fireEvent.change(screen.getByLabelText('Choose gathering'), {
    target: { value: '4' },
  })
  await screen.findByText('Asha Bose · confirmed')
  expect(
    global.fetch.mock.calls
      .filter(([, init]) => init.method === 'POST')
      .map(([url]) => url),
  ).toEqual(['/api/events', '/api/announcements'])
})

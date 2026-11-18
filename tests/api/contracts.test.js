const request = require('supertest')
const { makeApp } = require('../../server/app')
const member = { id: 1, name: 'Alex', role: 'member', status: 'approved' }
test('authentication limit expires after its window', async () => {
  const now = jest.spyOn(Date, 'now')
  try {
    now.mockReturnValue(1000)
    const server = app()
    for (let i = 0; i < 30; i++)
      await request(server).post('/api/auth/login').send({}).expect(422)
    await request(server).post('/api/auth/login').send({}).expect(429)
    now.mockReturnValue(62000)
    await request(server).post('/api/auth/login').send({}).expect(422)
  } finally {
    now.mockRestore()
  }
})
const cookie = 'alumni_session=' + 'a'.repeat(64)
function app(user = member) {
  return makeApp(
    {
      sql: { execute: async () => [[user]], query: async () => [[]] },
      mongo: { command: async () => ({ ok: 1 }) },
    },
    { logError: false },
  )
}
test('health checks both databases', async () => {
  await request(app()).get('/api/health').expect(200, { ready: true })
})
test.each([
  'me',
  'events',
  'members',
  'announcements',
  'messages',
  'jobs',
  'applications',
  'me/bookings',
  'events/1/roster',
])('anonymous cannot access %s', async (path) => {
  await request(app())
    .get('/api/' + path)
    .expect(401)
})
test.each([
  ['post', 'events'],
  ['post', 'announcements'],
  ['get', 'applications'],
  ['patch', 'applications/2'],
  ['get', 'events/1/roster'],
])('organizer restriction on %s %s', async (method, path) => {
  await request(app())
    [method]('/api/' + path)
    .set('Cookie', cookie)
    .send({})
    .expect(403)
})
test.each([
  ['post', 'auth/register', {}],
  ['put', 'events/1/rsvp', { intent: 'join', expectedRevision: -1 }],
  ['patch', 'me', { role: 'organizer' }],
  ['post', 'messages/2', { body: '  ' }],
  ['post', 'messages/1', { body: 'self' }],
  ['post', 'messages/2', { body: 'a'.repeat(32001) }],
])('validates %s %s', async (method, path, body) => {
  await request(app())
    [method]('/api/' + path)
    .set('Cookie', cookie)
    .send(body)
    .expect(422)
})
test('pending access and foreign origins', async () => {
  await request(app({ ...member, status: 'pending' }))
    .get('/api/events')
    .set('Cookie', cookie)
    .expect(403)
  await request(app())
    .post('/api/auth/logout')
    .set('Origin', 'https://other.example')
    .expect(403)
})
test('bad JSON and unreasonable body produce client errors', async () => {
  await request(app())
    .post('/api/auth/login')
    .type('json')
    .send('{')
    .expect(400)
  await request(app())
    .post('/api/auth/login')
    .send({ password: 'x'.repeat(530000) })
    .expect(413)
})
test('unknown endpoint and database outage have distinct responses', async () => {
  await request(app()).get('/api/missing').set('Cookie', cookie).expect(404)
  const offline = makeApp(
    {
      sql: {
        query: async () => {
          throw Error('down')
        },
      },
      mongo: { command: async () => ({}) },
    },
    { logError: false },
  )
  await request(offline)
    .get('/api/health')
    .expect(503, { code: 'SERVICE_UNAVAILABLE' })
})

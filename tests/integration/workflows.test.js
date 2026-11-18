const request = require('supertest')
const { fixture } = require('../fixture')
let f, host, first, second
const future = () => new Date(Date.now() + 7 * 86400000).toISOString()
const opportunity = () => ({
  title: 'Software Engineer', company: 'Alumni Systems', location: 'New Delhi',
  workMode: 'Hybrid', type: 'full_time', field: 'Engineering', description: 'Build reliable APIs.',
  skills: ['Node.js', 'MySQL'], salaryRange: 'INR 8-12 lakh', businessOwner: true, closesAt: future(),
})
function call(user, method, path, body) {
  const req = request(f.app)[method]('/api' + path)
  if (user) req.set('Cookie', user.cookie)
  return body === undefined ? req : req.send(body)
}
beforeAll(async () => {
  f = await fixture()
  ;[host, first, second] = await f.members(3)
})
afterAll(async () => { if (f) await f.close() })

test('a mentor publishes availability, two alumni compete, and a cancellation promotes the waiter atomically', async () => {
  const created = await call(host, 'post', '/mentor-sessions', {
    title: 'API mentoring', description: 'Bring a design question.', startsAt: future(),
    venue: 'Online', capacity: 1, mentorId: first.id,
  }).expect(201)
  const id = created.body.id
  const event = (await call(first, 'get', '/events/' + id)).body
  expect(event).toMatchObject({ mentorId: host.id, capacity: 1, kind: 'office_hours', available: 1 })
  const replies = await Promise.all([first, second].map((user) => call(user, 'put', '/events/' + id + '/rsvp', { intent: 'join', expectedRevision: 0 }).expect(200)))
  expect(replies.map((reply) => reply.body.status).sort()).toEqual(['confirmed', 'waitlisted'])
  const winner = replies[0].body.status === 'confirmed' ? first : second
  const waiter = winner === first ? second : first
  await call(host, 'put', '/events/' + id + '/rsvp', { intent: 'join', expectedRevision: 0 }).expect(422, { code: 'MENTOR_CANNOT_BOOK_OWN_SESSION' })
  expect((await call(host, 'get', '/events/' + id + '/roster').expect(200)).body).toHaveLength(2)
  await call(first, 'get', '/events/' + id + '/roster').expect(403)
  await call(winner, 'put', '/events/' + id + '/rsvp', { intent: 'leave', expectedRevision: 1 }).expect(200)
  const schedule = (await call(waiter, 'get', '/me/bookings')).body
  expect(schedule.find((item) => item.id === id)).toMatchObject({ status: 'confirmed', revision: 2 })
  expect((await call(host, 'get', '/events?mentorId=' + host.id)).body.map((item) => item.id)).toContain(id)
})

test('mentor publishing requires an approved, visible mentoring profile and a valid future session', async () => {
  const data = { title: 'Guidance', description: 'Career discussion', startsAt: future(), venue: 'Online', capacity: 1 }
  await call(null, 'post', '/mentor-sessions', data).expect(401)
  await call(host, 'post', '/mentor-sessions', { ...data, startsAt: '2000-01-01T00:00:00Z' }).expect(422)
  await call(host, 'post', '/mentor-sessions', { ...data, capacity: 0 }).expect(422)
  await f.db.sql.execute("UPDATE members SET mentor_topic='' WHERE id=?", [second.id])
  await call(second, 'post', '/mentor-sessions', data).expect(422, { code: 'MENTOR_REQUIRED' })
  await f.db.sql.execute('UPDATE members SET visible=0 WHERE id=?', [second.id])
  await call(second, 'post', '/mentor-sessions', data).expect(422)
})

test('an alumni business owner publishes, edits, closes and reopens their own opportunity', async () => {
  const created = await call(first, 'post', '/jobs', opportunity()).expect(201)
  const id = created.body._id
  expect(created.body).toMatchObject({ posterId: first.id, posterName: first.name, status: 'open', businessOwner: true })
  expect((await call(second, 'get', '/jobs?q=Software')).body.map((job) => job._id)).toContain(id)
  const edited = await call(first, 'patch', '/jobs/' + id, { title: 'Senior Software Engineer' }).expect(200)
  expect(edited.body.title).toBe('Senior Software Engineer')
  await call(second, 'patch', '/jobs/' + id, { title: 'Unauthorised edit' }).expect(404)
  await call(first, 'patch', '/jobs/' + id, { status: 'closed' }).expect(200)
  expect((await call(second, 'get', '/jobs')).body.map((job) => job._id)).not.toContain(id)
  expect((await call(first, 'get', '/jobs?mine=true')).body.find((job) => job._id === id).status).toBe('closed')
  expect((await call(second, 'get', '/jobs?mine=true')).body).toEqual([])
  await call(first, 'patch', '/jobs/' + id, { status: 'open', closesAt: future() }).expect(200)
  expect((await call(second, 'get', '/jobs')).body.map((job) => job._id)).toContain(id)
  await call(first, 'patch', '/jobs/' + id, { status: 'closed' }).expect(200)
  await f.db.mongo.collection('jobs').updateOne({ posterId: first.id }, { $set: { closesAt: new Date(0) } })
  await call(first, 'patch', '/jobs/' + id, { status: 'open' }).expect(422, { code: 'FUTURE_CLOSE_REQUIRED' })
})

test('career publishing rejects missing ownership, identity spoofing, invalid fields and unapproved access', async () => {
  const valid = opportunity()
  await call(null, 'post', '/jobs', valid).expect(401)
  await call(first, 'post', '/jobs', { ...valid, businessOwner: false }).expect(422)
  await call(first, 'post', '/jobs', { ...valid, posterId: second.id }).expect(422)
  await call(first, 'post', '/jobs', { ...valid, skills: [] }).expect(422)
  await call(first, 'post', '/jobs', { ...valid, closesAt: '2000-01-01T00:00:00Z' }).expect(422)
  await call(first, 'patch', '/jobs/invalid', { status: 'closed' }).expect(422)
  await call(first, 'patch', '/jobs/' + '0'.repeat(24), {}).expect(422)
  await call(first, 'patch', '/jobs/' + '0'.repeat(24), { status: 'closed' }).expect(404)
  const [pending] = await f.members(1)
  await f.db.sql.execute("UPDATE members SET status='pending' WHERE id=?", [pending.id])
  await call(pending, 'post', '/jobs', valid).expect(403)
  await call(pending, 'post', '/mentor-sessions', {}).expect(403)
})

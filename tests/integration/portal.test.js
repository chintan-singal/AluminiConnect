const request = require('supertest')
const { fixture } = require('../fixture')
let f, admin, a, b, c
beforeAll(async () => {
  f = await fixture()
  ;[admin] = await f.members(1, 'organizer')
  ;[a, b, c] = await f.members(3)
})
afterAll(async () => {
  if (f) await f.close()
})
function call(user, method, url, body) {
  const req = request(f.app)[method]('/api' + url)
  if (user) req.set('Cookie', user.cookie)
  return body === undefined ? req : req.send(body)
}
const book = (user, id, intent, expectedRevision) =>
  call(user, 'put', '/events/' + id + '/rsvp', { intent, expectedRevision })
test('registration, approval, login cookie, profile, directory, logout and rejection', async () => {
  const data = {
    name: 'New Graduate',
    email: 'new@example.test',
    password: 'new-graduate-pass',
    batch: 2024,
  }
  const created = await call(null, 'post', '/auth/register', data).expect(201)
  await call(null, 'post', '/auth/register', data).expect(409)
  await call(null, 'post', '/auth/login', {
    ...data,
    password: 'wrong-password',
  }).expect(401)
  const login = await call(null, 'post', '/auth/login', data).expect(204)
  expect(login.headers['set-cookie'][0]).toContain('HttpOnly')
  const user = { cookie: login.headers['set-cookie'][0].split(';')[0] }
  expect((await call(user, 'get', '/me').expect(200)).body.status).toBe(
    'pending',
  )
  await call(user, 'get', '/members').expect(403)
  expect(
    (await call(admin, 'get', '/applications').expect(200)).body.map(
      (m) => m.id,
    ),
  ).toContain(created.body.id)
  await call(admin, 'patch', '/applications/' + created.body.id, {
    status: 'approved',
  }).expect(200)
  await call(admin, 'patch', '/applications/' + created.body.id, {
    status: 'declined',
  }).expect(409)
  expect((await call(a, 'get', '/members?q=Graduate')).body).toEqual([])
  await call(user, 'patch', '/me', {
    name: 'New Graduate',
    field: 'Design',
    city: 'Pune',
    visible: true,
    mentorTopic: 'Portfolios',
  }).expect(200)
  const result = (
    await call(a, 'get', '/members?q=Graduate&batch=2024&mentor=true').expect(
      200,
    )
  ).body
  expect(result).toHaveLength(1)
  expect(result[0]).not.toHaveProperty('email')
  await call(user, 'post', '/auth/logout').expect(204)
  await call(user, 'get', '/me').expect(401)
  const other = await call(null, 'post', '/auth/register', {
    ...data,
    email: 'decline@example.test',
  }).expect(201)
  await call(admin, 'patch', '/applications/' + other.body.id, {
    status: 'declined',
  }).expect(200)
})
test('publish office hours, browse and inspect a private roster', async () => {
  const data = {
    kind: 'office_hours',
    title: 'Portfolio review',
    description: 'Bring one project',
    venue: 'Studio',
    capacity: 1,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    mentorId: b.id,
  }
  await call(admin, 'post', '/events', { ...data, capacity: 0 }).expect(422)
  await call(admin, 'post', '/events', {
    ...data,
    startsAt: '2001-01-01T00:00:00Z',
  }).expect(422)
  await call(admin, 'post', '/events', { ...data, mentorId: 999999 }).expect(
    422,
  )
  const {
    body: { id },
  } = await call(admin, 'post', '/events', data).expect(201)
  const list = await call(
    a,
    'get',
    '/events?kind=office_hours&mentorId=' + b.id,
  ).expect(200)
  expect(list.body.map((x) => x.id)).toContain(id)
  expect((await call(a, 'get', '/events/' + id)).body.booking.status).toBe(
    'none',
  )
  await book(a, id, 'join', 0).expect(200)
  expect(
    (await call(admin, 'get', '/events/' + id + '/roster')).body[0].id,
  ).toBe(a.id)
  expect(
    (await call(a, 'get', '/me/bookings')).body.map((x) => x.id),
  ).toContain(id)
  await call(a, 'get', '/events/999999').expect(404)
  await call(admin, 'get', '/events/999999/roster').expect(404)
  await book(a, 999999, 'join', 0).expect(404)
})
test('simultaneous signups persist exactly one winner and a distinct ticket for each waiter', async () => {
  const users = await f.members(20),
    id = await f.event(admin)
  const replies = await Promise.all(
    users.map((user) => book(user, id, 'join', 0).expect(200)),
  )
  const states = replies.map((r) => r.body)
  expect(states.filter((s) => s.status === 'confirmed')).toHaveLength(1)
  expect(
    states
      .filter((s) => s.status === 'waitlisted')
      .map((s) => s.queuePosition)
      .sort((x, y) => x - y),
  ).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
  const [rows] = await f.db.sql.execute(
    'SELECT status FROM bookings WHERE event_id=?',
    [id],
  )
  expect(rows.filter((b) => b.status === 'confirmed')).toHaveLength(1)
})
test('withdraw, rejoin at the tail, promote fairly and reject a lost-response replay', async () => {
  const id = await f.event(admin)
  await book(a, id, 'join', 0).expect(200)
  await book(a, id, 'join', 0).expect(409)
  expect((await book(a, id, 'join', 1)).body.revision).toBe(1)
  await book(b, id, 'join', 0)
  await book(c, id, 'join', 0)
  await book(b, id, 'leave', 1)
  expect((await book(b, id, 'join', 2)).body.queuePosition).toBe(2)
  const [d] = await f.members(1)
  await Promise.all([
    book(a, id, 'leave', 1).expect(200),
    book(d, id, 'join', 0).expect(200),
  ])
  const state = async (u) =>
    (await call(u, 'get', '/events/' + id)).body.booking
  expect((await state(c)).status).toBe('confirmed')
  expect((await state(b)).queuePosition).toBe(1)
  expect((await state(d)).queuePosition).toBe(2)
  const stale = await book(c, id, 'leave', 1).expect(409)
  expect(stale.body.current).toMatchObject({ status: 'confirmed', revision: 2 })
  await f.db.sql.execute(
    'UPDATE events SET starts_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE id=?',
    [id],
  )
  await book(c, id, 'leave', 2).expect(409, { code: 'EVENT_STARTED' })
})
test('failed promotion rolls cancellation back, then a clean retry moves both rows', async () => {
  const id = await f.event(admin)
  await book(a, id, 'join', 0)
  await book(b, id, 'join', 0)
  await f.db.sql.query(
    "CREATE TRIGGER fixture_fail_promotion BEFORE UPDATE ON bookings FOR EACH ROW BEGIN IF OLD.status='waitlisted' AND NEW.status='confirmed' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture failure'; END IF; END",
  )
  try {
    await book(a, id, 'leave', 1).expect(503)
    const [rows] = await f.db.sql.execute(
      'SELECT member_id,status,revision FROM bookings WHERE event_id=? ORDER BY member_id',
      [id],
    )
    expect(rows).toEqual([
      { member_id: a.id, status: 'confirmed', revision: 1 },
      { member_id: b.id, status: 'waitlisted', revision: 1 },
    ])
  } finally {
    await f.db.sql.query('DROP TRIGGER fixture_fail_promotion')
  }
  await book(a, id, 'leave', 1).expect(200)
  expect((await call(b, 'get', '/events/' + id)).body.booking).toMatchObject({
    status: 'confirmed',
    revision: 2,
  })
})
test('documents persist, paginate and remain confined to the two participants', async () => {
  await call(admin, 'post', '/announcements', {
    title: 'Reunion',
    body: 'A'.repeat(40000),
  }).expect(201)
  expect(
    (await call(a, 'get', '/announcements')).body.items[0].body,
  ).toHaveLength(40000)
  for (let i = 0; i < 31; i++)
    await call(a, 'post', '/messages/' + b.id, { body: 'message ' + i }).expect(
      201,
    )
  const first = (await call(b, 'get', '/messages/' + a.id)).body
  expect(first.items).toHaveLength(30)
  expect(first.items[0].body).toBe('message 30')
  const second = (
    await call(b, 'get', '/messages/' + a.id + '?before=' + first.next)
  ).body
  expect(second.items.map((m) => m.body)).toEqual(['message 0'])
  expect((await call(c, 'get', '/messages/' + a.id)).body.items).toEqual([])
  expect((await call(b, 'get', '/messages')).body[0].last.senderId).toBe(a.id)
  expect((await call(c, 'get', '/messages')).body).toEqual([])
  await call(b, 'get', '/messages/' + a.id + '?before=bad').expect(422)
  await call(b, 'post', '/messages/999999', { body: 'test' }).expect(404)
  expect(
    await f.db.mongo.collection('messages').countDocuments({ senderId: a.id }),
  ).toBe(31)
  await f.db.sql.execute('UPDATE members SET visible=0 WHERE id=?', [a.id])
  await call(c, 'post', '/messages/' + a.id, {
    body: 'New conversation',
  }).expect(404)
  await call(b, 'post', '/messages/' + a.id, {
    body: 'Existing conversation',
  }).expect(201)
})
test('new API instance reads prior bookings and an unavailable content store cannot interrupt a handoff', async () => {
  const { stores } = require('../../server/db')
  const { makeApp } = require('../../server/app')
  const id = await f.event(admin)
  await book(a, id, 'join', 0).expect(200)
  await book(b, id, 'join', 0).expect(200)
  const reopened = stores(f.config)
  try {
    const restarted = request(makeApp(reopened))
    expect(
      (await restarted.get('/api/events/' + id).set('Cookie', b.cookie)).body
        .booking.queuePosition,
    ).toBe(1)
    const outage = request(
      makeApp(
        {
          sql: reopened.sql,
          mongo: {
            collection() {
              throw Error('content offline')
            },
          },
        },
        { logError: false },
      ),
    )
    await outage.get('/api/announcements').set('Cookie', a.cookie).expect(503)
    await outage
      .put('/api/events/' + id + '/rsvp')
      .set('Cookie', a.cookie)
      .send({ intent: 'leave', expectedRevision: 1 })
      .expect(200)
    expect(
      (await restarted.get('/api/events/' + id).set('Cookie', b.cookie)).body
        .booking.status,
    ).toBe('confirmed')
  } finally {
    await reopened.close()
  }
})
test('installer provisions the organizer and can be safely rerun', async () => {
  const execFile = require('node:util').promisify(
    require('node:child_process').execFile,
  )
  const email = 'office@example.test'
  const env = {
    ...process.env,
    ...f.config,
    ORGANIZER_EMAIL: email,
    ORGANIZER_PASSWORD: f.password,
  }
  const install = () =>
    execFile(process.execPath, [require.resolve('../../scripts/init')], {
      env,
      windowsHide: true,
    })
  await install()
  await install()
  const [[row]] = await f.db.sql.execute(
    'SELECT COUNT(*) AS total FROM members WHERE email=? AND role=?',
    [email, 'organizer'],
  )
  expect(row.total).toBe(1)
  await call(null, 'post', '/auth/login', {
    email,
    password: f.password,
  }).expect(204)
  await call(null, 'post', '/auth/login', {
    email: 'unknown@example.test',
    password: f.password,
  }).expect(401)
})
test('a reservation queued behind an event lock sees the closing time on release', async () => {
  const id = await f.event(admin)
  const owner = await f.db.sql.getConnection()
  try {
    await owner.beginTransaction()
    await owner.execute('SELECT id FROM events WHERE id=? FOR UPDATE', [id])
    const queued = book(a, id, 'join', 0).then((response) => response.status)
    await owner.execute(
      'UPDATE events SET starts_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE id=?',
      [id],
    )
    await owner.commit()
    expect(await queued).toBe(409)
  } finally {
    await owner.rollback()
    owner.release()
  }
})
test('directory field and city filters are applied before pagination', async () => {
  const [graduate] = await f.members(1)
  await f.db.sql.execute('UPDATE members SET city=?,field=? WHERE id=?', [
    'Kathmandu',
    'Biotechnology',
    graduate.id,
  ])
  const query = new URLSearchParams({
    q: graduate.name,
    city: 'kath',
    field: 'bio',
  }).toString()
  const result = await call(b, 'get', '/members?' + query).expect(200)
  expect(result.body.map((person) => person.id)).toEqual([graduate.id])
  expect(
    (await call(b, 'get', '/members?' + query + '&batch=1900')).body,
  ).toEqual([])
  expect(
    (await call(b, 'get', '/members?city=' + encodeURIComponent("' OR 1=1 --")))
      .body,
  ).toEqual([])
})
test('past event discovery preserves upcoming defaults and validates the period', async () => {
  const past = await f.event(admin)
  const upcoming = await f.event(admin)
  await f.db.sql.execute(
    'UPDATE events SET starts_at=UTC_TIMESTAMP()-INTERVAL 1 DAY WHERE id=?',
    [past],
  )
  const archive = (
    await call(a, 'get', '/events?period=past').expect(200)
  ).body.map((event) => event.id)
  expect(archive).toContain(past)
  expect(archive).not.toContain(upcoming)
  const current = (await call(a, 'get', '/events').expect(200)).body.map(
    (event) => event.id,
  )
  expect(current).toContain(upcoming)
  expect(current).not.toContain(past)
  await call(a, 'get', '/events?period=invalid').expect(422)
})

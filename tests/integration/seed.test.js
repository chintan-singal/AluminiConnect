const request = require('supertest')
const { fixture } = require('../fixture')
const { seedDemo } = require('../../scripts/seed-demo')
const { reserve } = require('../../server/booking')
const data = require('../../scripts/demo-data')
let f

beforeAll(async () => { f = await fixture() })
afterAll(async () => { if (f) await f.close() })

test('demo seeding recovers from partial failure and preserves edits, accounts and booking actions on rerun', async () => {
  const [existing] = await f.members(1, 'organizer')
  const [[original]] = await f.db.sql.execute('SELECT * FROM members WHERE id=?', [existing.id])
  const collection = f.db.mongo.collection.bind(f.db.mongo)
  const offline = {
    ...f.db,
    mongo: { collection(name) {
      if (name !== 'announcements') return collection(name)
      const announcements = collection(name)
      announcements.bulkWrite = async () => { throw Error('interrupted seed') }
      return announcements
    } },
  }
  await expect(seedDemo(offline, { password: f.password })).rejects.toThrow('interrupted seed')
  const result = await seedDemo(f.db, { password: f.password })
  expect(result).toMatchObject({ members: 28, mentors: 12, events: 16, bookings: 91, announcements: 6, jobs: 6 })
  expect(result.messages).toBe(304)
  const [[after]] = await f.db.sql.execute('SELECT * FROM members WHERE id=?', [existing.id])
  expect(after).toEqual(original)

  const login = await request(f.app).post('/api/auth/login').send({
    email: data.people[1].email, password: f.password,
  }).expect(204)
  const cookie = login.headers['set-cookie'][0].split(';')[0]
  const me = (await request(f.app).get('/api/me').set('Cookie', cookie).expect(200)).body
  const events = (await request(f.app).get('/api/events').set('Cookie', cookie).expect(200)).body
  const design = events.find((event) => event.title.includes('Design portfolio'))
  expect(events).toHaveLength(14)
  expect(design.available).toBe(0)
  expect((await request(f.app).get('/api/events?period=past').set('Cookie', cookie)).body).toHaveLength(2)
  expect((await request(f.app).get('/api/members?mentor=true').set('Cookie', cookie)).body).toHaveLength(13)
  // The fixture member also offers mentoring, alongside the twelve demo mentors.
  expect((await request(f.app).get('/api/me/bookings').set('Cookie', cookie)).body).toHaveLength(15)
  expect((await request(f.app).get('/api/messages').set('Cookie', existing.cookie)).body).toHaveLength(4)
  expect((await request(f.app).get('/api/messages').set('Cookie', cookie)).body.length).toBeGreaterThan(0)

  const jobs = await request(f.app).get('/api/jobs').set('Cookie', cookie).expect(200)
  expect(jobs.body).toHaveLength(6)
  expect(jobs.body[0]).toMatchObject({ title: 'Junior Backend Engineer', synthetic: true })
  expect(jobs.body[0].seedKey).toBeUndefined()
  const filtered = await request(f.app).get('/api/jobs?q=backend&location=bengaluru&type=full_time').set('Cookie', cookie).expect(200)
  expect(filtered.body.map((job) => job.title)).toEqual(['Junior Backend Engineer'])
  expect((await request(f.app).get('/api/jobs?q=.*').set('Cookie', cookie)).body).toEqual([])
  expect((await request(f.app).get('/api/jobs?location=.*').set('Cookie', cookie)).body).toEqual([])
  expect((await request(f.app).get('/api/jobs?page=2').set('Cookie', cookie)).body).toEqual([])
  await request(f.app).get('/api/jobs?type=invalid').set('Cookie', cookie).expect(422)
  await request(f.app).get('/api/jobs?q=' + 'x'.repeat(121)).set('Cookie', cookie).expect(422)
  await f.db.mongo.collection('jobs').insertMany([
    { status: 'open', closesAt: new Date(0), title: 'Expired' },
    { status: 'closed', closesAt: new Date('2099-01-01'), title: 'Closed' },
  ])
  expect((await request(f.app).get('/api/jobs').set('Cookie', cookie)).body).toHaveLength(6)

  await reserve(f.db.sql, design.id, me.id, 'leave', 1)
  await f.db.sql.execute('UPDATE members SET city=? WHERE id=?', ['Edited city', me.id])
  await f.db.sql.execute('UPDATE members SET name=?,email=? WHERE id=?', ['Arjun Sen (Demo)', data.people[1].email.replace(data.domain, 'sau-demo.example.test'), me.id])
  await f.db.sql.execute('UPDATE events SET title=?,description=?,venue=? WHERE id=?', ['[Demo] Design portfolio clinic', 'Synthetic project event.', 'Demo online room', design.id])
  await f.db.mongo.collection('jobs').updateOne({ seedKey: 'sau-demo-v1:job:backend' }, { $unset: { presentationVersion: '' }, $set: { company: 'Meridian Labs (fictional)', status: 'closed' } })
  await f.db.mongo.collection('messages').updateOne({ synthetic: true }, { $unset: { presentationVersion: '' }, $set: { body: 'Demo conversation.' } })
  const again = await seedDemo(f.db, { password: 'different-demo-password' })
  expect(again).toEqual(result)
  const [[booking]] = await f.db.sql.execute('SELECT status,revision FROM bookings WHERE event_id=? AND member_id=?', [design.id, me.id])
  expect(booking).toEqual({ status: 'cancelled', revision: 2 })
  const profile = (await request(f.app).get('/api/me').set('Cookie', cookie)).body
  expect(profile.city).toBe('Edited city')
  expect(profile.name).toBe('Arjun Sen')
  expect((await request(f.app).get('/api/events/' + design.id).set('Cookie', cookie)).body.title).toBe('Design portfolio clinic')
  const normalized = await f.db.mongo.collection('jobs').findOne({ seedKey: 'sau-demo-v1:job:backend' })
  expect(normalized).toMatchObject({ company: 'Meridian Labs', status: 'closed', synthetic: true })
  expect(await f.db.mongo.collection('messages').countDocuments({ body: 'Demo conversation.' })).toBe(0)
  await request(f.app).post('/api/auth/login').send({ email: data.people[1].email, password: f.password }).expect(204)
  const [overbooked] = await f.db.sql.query("SELECT e.id FROM events e JOIN bookings b ON b.event_id=e.id WHERE b.status='confirmed' GROUP BY e.id,e.capacity HAVING COUNT(*)>e.capacity")
  expect(overbooked).toEqual([])
})

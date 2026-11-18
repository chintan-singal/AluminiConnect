const crypto = require('node:crypto')
const { ObjectId } = require('mongodb')
const { stores, initialize } = require('../server/db')
const { hashPassword, threadKey } = require('../server/core')
const { reserve, readBooking } = require('../server/booking')
const data = require('./demo-data')
const seedName = 'sau-demo-v1'
const day = 86400000

function sampleDocument(key, date, value) {
  const suffix = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16)
  const timestamp = Math.floor(date.getTime() / 1000).toString(16).padStart(8, '0')
  return { updateOne: {
    filter: { seedKey: seedName + ':' + key },
    update: { $setOnInsert: {
      _id: new ObjectId(timestamp + suffix), seedKey: seedName + ':' + key,
      synthetic: true, presentationVersion: 2, ...value,
    } },
    upsert: true,
  } }
}

async function writeContent(collection, writes) {
  await collection.bulkWrite(writes)
  const textFields = ['title', 'body', 'description', 'company', 'posterName', 'senderName', 'recipientName', 'authorName']
  await collection.bulkWrite(writes.map(({ updateOne }) => {
    const content = updateOne.update.$setOnInsert
    const text = Object.fromEntries(textFields.filter((key) => key in content).map((key) => [key, content[key]]))
    return { updateOne: {
      filter: { ...updateOne.filter, presentationVersion: { $ne: 2 } },
      update: { $set: { ...text, presentationVersion: 2 } },
    } }
  }))
}

async function seedDemo(db, { password = data.password, now = new Date() } = {}) {
  if (password.length < 10) throw new Error('Demo password requires 10 characters')
  await initialize(db)
  const conn = await db.sql.getConnection()
  let locked = false
  const members = new Map()
  const events = new Map()
  try {
    const [[lock]] = await conn.execute('SELECT GET_LOCK(?,10) AS acquired', [seedName])
    if (!lock.acquired) throw new Error('Another demo seed is running. Retry when it finishes.')
    locked = true
    const hash = await hashPassword(password)
    await conn.beginTransaction()
    try {
      for (const person of [data.office, ...data.people, ...data.applicants]) {
        const legacyEmail = person.email.replace(data.domain, 'sau-demo.example.test')
        const [[legacy]] = await conn.execute('SELECT id,name FROM members WHERE email=?', [legacyEmail])
        if (legacy) {
          const name = legacy.name === 'Demo Alumni Office' ? person.name : legacy.name.replace(/ \(Demo\)$/, '')
          await conn.execute('UPDATE members SET email=?,name=? WHERE id=?', [person.email, name, legacy.id])
        }
        // Existing demo profiles and passwords survive subsequent runs.
        await conn.execute(
          'INSERT INTO members(email,password_hash,name,batch,city,field,mentor_topic,visible,role,status) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
          [person.email, hash, person.name, person.batch, person.city, person.field,
            person.mentorTopic, person.status === 'approved', person.role, person.status],
        )
        const [[saved]] = await conn.execute('SELECT id,name,email FROM members WHERE email=?', [person.email])
        members.set(person.key, saved)
      }
      const creator = members.get(data.office.key)
      for (const event of data.events) {
        const title = event.title
        const [[existing]] = await conn.execute('SELECT id,starts_at,title FROM events WHERE creator_id=? AND title IN (?,?) ORDER BY id LIMIT 1', [creator.id, title, '[Demo] ' + title])
        if (existing) {
          if (existing.title.startsWith('[Demo] ')) {
            await conn.execute('UPDATE events SET title=?,description=?,venue=? WHERE id=?', [title, event.description, event.venue, existing.id])
          }
          events.set(event.key, { id: existing.id, startsAt: existing.starts_at })
          continue
        }
        const startsAt = new Date(now.getTime() + event.days * day)
        startsAt.setUTCHours(10, 0, 0, 0)
        const [result] = await conn.execute(
          'INSERT INTO events(title,description,kind,starts_at,venue,capacity,creator_id,mentor_id) VALUES (?,?,?,?,?,?,?,?)',
          [title, event.description, event.kind, startsAt,
            event.venue, event.capacity, creator.id, event.mentor ? members.get(event.mentor).id : null],
        )
        events.set(event.key, { id: result.insertId, startsAt })
      }
      await conn.commit()
    } catch (error) {
      await conn.rollback()
      throw error
    }

    // Use the booking service so sample seats obey the normal lock and queue rules.
    for (const event of data.events) {
      const saved = events.get(event.key)
      if (event.days > 0 && saved.startsAt <= now) continue
      if (event.mentor && saved.startsAt > now) {
        const host = members.get(event.mentor).id
        const booking = await readBooking(db.sql, saved.id, host)
        if (['confirmed', 'waitlisted'].includes(booking.status)) {
          await reserve(db.sql, saved.id, host, 'leave', booking.revision)
        }
      }
      const participants = data.people.slice(0, event.key === 'design' ? 7 : 6).filter((person) => person.key !== event.mentor)
      for (const person of participants) {
        const memberId = members.get(person.key).id
        if (event.days < 0) {
          await conn.execute(
            "INSERT INTO bookings(event_id,member_id,status,revision,ticket) VALUES (?,?,'confirmed',1,NULL) ON DUPLICATE KEY UPDATE event_id=event_id",
            [saved.id, memberId],
          )
        } else if ((await readBooking(db.sql, saved.id, memberId)).revision === 0) {
          try {
            await reserve(db.sql, saved.id, memberId, 'join', 0)
          } catch (error) {
            if (error.code !== 'STALE_BOOKING') throw error
          }
        }
      }
    }

    for (const collection of ['announcements', 'messages', 'jobs']) {
      await db.mongo.collection(collection).createIndex({ seedKey: 1 }, { unique: true, sparse: true })
    }
    const author = members.get(data.office.key)
    await writeContent(db.mongo.collection('announcements'), data.announcements.map((notice, index) => {
      const publishedAt = new Date(now.getTime() - index * day)
      return sampleDocument('notice:' + notice.key, publishedAt, {
        authorId: author.id, authorName: author.name, title: notice.title,
        body: notice.body, publishedAt,
      })
    }))
    await writeContent(db.mongo.collection('jobs'), data.jobs.map((job, index) => {
      const { key, poster: posterKey, ...details } = job
      const poster = members.get(posterKey)
      const publishedAt = new Date(now.getTime() - index * day)
      return sampleDocument('job:' + key, publishedAt, {
        ...details, status: 'open',
        posterId: poster.id, posterName: poster.name, publishedAt,
        closesAt: new Date(now.getTime() + (30 + index * 5) * day),
      })
    }))

    const messageWrites = []
    const demoIds = [...members.values()].map((person) => person.id)
    const [existingMembers] = await conn.query("SELECT id,name FROM members WHERE status='approved' AND id NOT IN (?)", [demoIds])
    const recipients = [...data.people.map((person) => members.get(person.key)), author]
    for (const [index, recipient] of recipients.entries()) {
      // Each demo account has three coherent, two-way sample conversations.
      for (let peer = 1; peer <= 3; peer++) {
        const sender = members.get(data.people[(index + peer) % data.people.length].key)
        const lines = [
          [sender, recipient, 'Hello! I saw your profile in the alumni directory. Would you like to exchange ideas at an upcoming mentoring session?'],
          [recipient, sender, 'That sounds good. I am exploring the community events and would enjoy hearing about your experience.'],
          [sender, recipient, 'You can find my office hours under Events. If a session fills up, joining its waitlist keeps your place for the next available seat.'],
          [recipient, sender, 'Thanks for the introduction. I will take a look at the schedule and the career opportunities.'],
        ]
        for (const [lineIndex, [from, to, body]] of lines.entries()) {
          const sentAt = new Date(now.getTime() - (index * 12 + peer * 2) * 3600000 + lineIndex * 60000)
          messageWrites.push(sampleDocument('chat:' + recipient.id + ':' + sender.id + ':' + lineIndex, sentAt, {
            thread: threadKey(from.id, to.id), senderId: from.id, senderName: from.name,
            recipientId: to.id, recipientName: to.name, body, sentAt,
          }))
        }
      }
    }
    // Existing accounts receive labeled incoming examples, with no invented replies.
    for (const recipient of existingMembers) {
      for (const [index, person] of data.people.slice(0, 4).entries()) {
        const sender = members.get(person.key)
        const sentAt = new Date(now.getTime() - index * 3600000)
        messageWrites.push(sampleDocument('welcome:' + recipient.id + ':' + sender.id, sentAt, {
          thread: threadKey(sender.id, recipient.id), senderId: sender.id, senderName: sender.name,
          recipientId: recipient.id, recipientName: recipient.name, sentAt,
          body: 'Hello! I would love to help our alumni community with mentoring sessions and career guidance. Let me know how I can get involved in upcoming events.',
        }))
      }
    }
    await writeContent(db.mongo.collection('messages'), messageWrites)
    const [[bookings]] = await conn.query('SELECT COUNT(*) AS total FROM bookings WHERE event_id IN (?)', [[...events.values()].map((event) => event.id)])
    return {
      members: members.size, mentors: data.people.filter((person) => person.mentorTopic).length,
      events: events.size, bookings: bookings.total,
      announcements: await db.mongo.collection('announcements').countDocuments({ synthetic: true }),
      messages: await db.mongo.collection('messages').countDocuments({ synthetic: true }),
      jobs: await db.mongo.collection('jobs').countDocuments({ synthetic: true }),
    }
  } finally {
    try {
      if (locked) await conn.execute('SELECT RELEASE_LOCK(?)', [seedName])
    } finally {
      conn.release()
    }
  }
}

async function main() {
  const db = stores()
  try {
    const password = process.env.DEMO_PASSWORD || data.password
    console.log('Synthetic demo data ready', await seedDemo(db, { password }))
    console.log('Demo member:', data.people[0].email)
    console.log('Demo organizer:', data.office.email)
    console.log('Password for newly created demo accounts:', password)
  } finally {
    await db.close()
  }
}
if (require.main === module) main().catch((error) => {
  console.error('Demo seed failed:', error.message)
  process.exitCode = 1
})
module.exports = { seedDemo }

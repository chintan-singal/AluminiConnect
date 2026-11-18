const { Problem, decide } = require('./core')
const { transaction } = require('./db')

async function readBooking(conn, eventId, memberId) {
  const [rows] = await conn.execute(
    "SELECT b.status,b.revision, CASE WHEN b.status='waitlisted' THEN 1+(SELECT COUNT(*) FROM bookings q WHERE q.event_id=b.event_id AND q.status='waitlisted' AND q.ticket<b.ticket) END AS queuePosition FROM bookings b WHERE b.event_id=? AND b.member_id=?",
    [eventId, memberId],
  )
  return rows[0] || { status: 'none', revision: 0, queuePosition: null }
}

async function reserve(pool, eventId, memberId, intent, revision) {
  return transaction(pool, async (conn) => {
    const [[event]] = await conn.execute(
      'SELECT capacity, starts_at, mentor_id FROM events WHERE id=? FOR UPDATE',
      [eventId],
    )
    if (!event) throw new Problem(404, 'EVENT_MISSING')
    if (event.mentor_id === memberId && intent === 'join')
      throw new Problem(422, 'MENTOR_CANNOT_BOOK_OWN_SESSION')
    const [[counts]] = await conn.execute(
      `SELECT UTC_TIMESTAMP(3) AS nowUtc,
         COUNT(CASE WHEN b.status='confirmed' THEN 1 END) AS used,
         COUNT(b.ticket) AS waiting, COALESCE(MAX(b.ticket),0) AS lastTicket,
         MAX(own.status) AS ownStatus, MAX(own.revision) AS ownRevision,
         1+COUNT(CASE WHEN b.status='waitlisted' AND b.ticket<own.ticket THEN 1 END) AS ownPosition
       FROM events e
       LEFT JOIN bookings own ON own.event_id=e.id AND own.member_id=?
       LEFT JOIN bookings b ON b.event_id=e.id
       WHERE e.id=?`,
      [memberId, eventId],
    )
    if (event.starts_at <= counts.nowUtc)
      throw new Problem(409, 'EVENT_STARTED')
    const current = {
      status: counts.ownStatus || 'none',
      revision: counts.ownRevision || 0,
      queuePosition: counts.ownStatus === 'waitlisted' ? counts.ownPosition : null,
    }
    const status = decide(
      current,
      intent,
      revision,
      event.capacity - counts.used,
    )
    if (status === current.status) return current
    const ticket = status === 'waitlisted' ? counts.lastTicket + 1 : null
    await conn.execute(
      'INSERT INTO bookings(event_id,member_id,status,revision,ticket) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status=?,revision=?,ticket=?',
      [
        eventId,
        memberId,
        status,
        revision + 1,
        ticket,
        status,
        revision + 1,
        ticket,
      ],
    )
    if (current.status === 'confirmed' && status === 'cancelled') {
      await conn.execute(
        "UPDATE bookings SET status='confirmed',ticket=NULL,revision=revision+1 WHERE event_id=? AND status='waitlisted' ORDER BY ticket LIMIT 1",
        [eventId],
      )
    }
    return {
      status,
      revision: revision + 1,
      queuePosition: ticket === null ? null : counts.waiting + 1,
    }
  })
}
module.exports = { reserve, readBooking }

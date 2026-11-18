const { Problem } = require('./core')
const { reserve, readBooking } = require('./booking')
const fields =
  'e.id,e.title,e.description,e.kind,e.starts_at AS startsAt,e.venue,e.capacity,e.mentor_id AS mentorId,m.name AS mentorName'
const availability =
  "(e.capacity-(SELECT COUNT(*) FROM bookings b WHERE b.event_id=e.id AND b.status='confirmed')) AS available"
const fromEvents = ' FROM events e LEFT JOIN members m ON e.mentor_id=m.id '
function eventsStore(pool) {
  async function create(userId, data) {
    if (Date.parse(data.startsAt) <= Date.now())
      throw new Problem(422, 'PAST_START')
    if (data.kind === 'office_hours') {
      const [[mentor]] = await pool.execute(
        "SELECT id FROM members WHERE id=? AND visible=1 AND status='approved' AND mentor_topic<>''",
        [data.mentorId ?? 0],
      )
      if (!mentor) throw new Problem(422, 'MENTOR_REQUIRED')
    }
    const [res] = await pool.execute(
      'INSERT INTO events(title,description,kind,starts_at,venue,capacity,mentor_id,creator_id) VALUES (?,?,?,?,?,?,?,?)',
      [
        data.title,
        data.description,
        data.kind,
        new Date(data.startsAt),
        data.venue,
        data.capacity,
        data.kind === 'office_hours' ? data.mentorId : null,
        userId,
      ],
    )
    return { id: res.insertId }
  }
  async function list({ kind, mentorId, period = 'upcoming', page = 1 }) {
    const where = [
        period === 'past'
          ? 'e.starts_at<=UTC_TIMESTAMP(3)'
          : 'e.starts_at>UTC_TIMESTAMP(3)',
      ],
      args = []
    if (kind) {
      where.push('e.kind=?')
      args.push(kind)
    }
    if (mentorId) {
      where.push('e.mentor_id=?')
      args.push(mentorId)
    }
    args.push((page - 1) * 30)
    const [rows] = await pool.query(
      'SELECT ' +
        fields +
        ',' +
        availability +
        fromEvents +
        'WHERE ' +
        where.join(' AND ') +
        (period === 'past'
          ? ' ORDER BY e.starts_at DESC,e.id DESC'
          : ' ORDER BY e.starts_at,e.id') +
        ' LIMIT 30 OFFSET ?',
      args,
    )
    return rows
  }
  async function detail(id, userId) {
    const [[event]] = await pool.execute(
      'SELECT ' + fields + ',' + availability + fromEvents + ' WHERE e.id=?',
      [id],
    )
    if (!event) throw new Problem(404, 'EVENT_MISSING')
    return { ...event, booking: await readBooking(pool, id, userId) }
  }
  async function schedule(userId) {
    const [rows] = await pool.execute(
      'SELECT ' +
        fields +
        ",b.status,b.revision,CASE WHEN b.status='waitlisted' THEN 1+(SELECT COUNT(*) FROM bookings q WHERE q.event_id=e.id AND q.status='waitlisted' AND q.ticket<b.ticket) END AS queuePosition" +
        fromEvents +
        ' JOIN bookings b ON b.event_id=e.id WHERE b.member_id=? ORDER BY e.starts_at,e.id',
      [userId],
    )
    return rows
  }
  async function roster(id, viewer) {
    const [[event]] = await pool.execute('SELECT id,mentor_id FROM events WHERE id=?', [
      id,
    ])
    if (!event) throw new Problem(404, 'EVENT_MISSING')
    if (viewer.role !== 'organizer' && event.mentor_id !== viewer.id)
      throw new Problem(403, 'HOST_OR_ORGANIZER_REQUIRED')
    const [rows] = await pool.execute(
      "SELECT m.name,m.id,b.status,b.ticket FROM bookings b JOIN members m ON m.id=b.member_id WHERE b.event_id=? AND b.status<>'cancelled' ORDER BY b.status,b.ticket,m.id",
      [id],
    )
    return rows
  }
  return {
    create,
    list,
    detail,
    schedule,
    roster,
    reserve: (...args) => reserve(pool, ...args),
  }
}
module.exports = { eventsStore }

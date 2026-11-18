const crypto = require('node:crypto')
const { Problem, hashPassword, verifyPassword, digest } = require('./core')
const columns = 'id,name,batch,city,field,mentor_topic AS mentorTopic,visible'
const publicColumns =
  'm.id,m.name,m.batch,m.city,m.field,m.mentor_topic AS mentorTopic'
function membersStore(pool) {
  async function register(input) {
    const hash = await hashPassword(input.password)
    const [res] = await pool.execute(
      'INSERT INTO members(email,password_hash,name,batch) VALUES (?,?,?,?)',
      [input.email.toLowerCase(), hash, input.name, input.batch],
    )
    return { id: res.insertId, status: 'pending' }
  }
  async function login({ email, password }) {
    const [[row]] = await pool.execute(
      'SELECT id,password_hash FROM members WHERE email=?',
      [email.toLowerCase()],
    )
    const valid = await verifyPassword(
      password,
      row?.password_hash || 'dummy.' + '00'.repeat(64),
    )
    if (!row || !valid) throw new Problem(401, 'INVALID_LOGIN')
    const token = crypto.randomBytes(32).toString('hex')
    await pool.execute(
      'INSERT INTO sessions VALUES (?,?,UTC_TIMESTAMP()+INTERVAL 7 DAY)',
      [digest(token), row.id],
    )
    return token
  }
  async function identify(token) {
    if (!token) return null
    const [[member]] = await pool.execute(
      'SELECT m.id,m.name,m.role,m.status FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.digest=? AND s.expires_at>UTC_TIMESTAMP()',
      [digest(token)],
    )
    return member || null
  }
  async function profile(id) {
    const [[row]] = await pool.execute(
      'SELECT ' + columns + ',email,role,status FROM members WHERE id=?',
      [id],
    )
    return row
  }
  async function edit(id, data) {
    await pool.execute(
      'UPDATE members SET name=?,city=?,field=?,visible=?,mentor_topic=? WHERE id=?',
      [
        data.name,
        data.city,
        data.field,
        data.visible,
        data.visible ? data.mentorTopic : '',
        id,
      ],
    )
    return profile(id)
  }
  async function directory({ q = '', batch, mentor, city, field, page = 1 }) {
    const where = ["m.status='approved'", 'm.visible=1', 'm.name LIKE ?']
    const args = ['%' + q + '%']
    if (batch) {
      where.push('m.batch=?')
      args.push(batch)
    }
    if (mentor) where.push("m.mentor_topic<>''")
    if (city) {
      where.push('m.city LIKE ?')
      args.push('%' + city + '%')
    }
    if (field) {
      where.push('m.field LIKE ?')
      args.push('%' + field + '%')
    }
    args.push((page - 1) * 30)
    const [rows] = await pool.query(
      'SELECT ' +
        publicColumns +
        ' FROM members m WHERE ' +
        where.join(' AND ') +
        ' ORDER BY m.name,m.id LIMIT 30 OFFSET ?',
      args,
    )
    return rows
  }
  async function peer(id) {
    const [[row]] = await pool.execute(
      "SELECT id,name,visible FROM members WHERE id=? AND status='approved'",
      [id],
    )
    if (!row) throw new Problem(404, 'MEMBER_UNAVAILABLE')
    return row
  }
  async function applications() {
    const [rows] = await pool.query(
      "SELECT id,name,batch,email FROM members WHERE status='pending' ORDER BY id",
    )
    return rows
  }
  async function review(id, status) {
    const [res] = await pool.execute(
      "UPDATE members SET status=? WHERE id=? AND status='pending'",
      [status, id],
    )
    if (!res.affectedRows) throw new Problem(409, 'ALREADY_REVIEWED_OR_MISSING')
    return { id, status }
  }
  return {
    register,
    login,
    identify,
    profile,
    edit,
    directory,
    peer,
    applications,
    review,
    logout: (token) =>
      pool.execute('DELETE FROM sessions WHERE digest=?', [digest(token)]),
  }
}
module.exports = { membersStore }

const crypto = require('node:crypto')
const { promisify } = require('node:util')
const scrypt = promisify(crypto.scrypt)

class Problem extends Error {
  constructor(status, code, details) {
    super(code)
    Object.assign(this, { status, code, details })
  }
}
const digest = (value) =>
  crypto.createHash('sha256').update(value).digest('hex')
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return salt + '.' + key.toString('hex')
}
async function verifyPassword(password, encoded) {
  const [salt, hex] = encoded.split('.')
  const candidate = await scrypt(password, salt, 64)
  const saved = Buffer.from(hex || '', 'hex')
  return (
    saved.length === candidate.length &&
    crypto.timingSafeEqual(saved, candidate)
  )
}
function sessionToken(cookie = '') {
  return cookie.match(/(?:^|;\s*)alumni_session=([a-f0-9]{64})(?:;|$)/)?.[1]
}
function decide(current, intent, expectedRevision, freeSeats) {
  if (current.revision !== expectedRevision)
    throw new Problem(409, 'STALE_BOOKING', current)
  const active = ['confirmed', 'waitlisted'].includes(current.status)
  if ((intent === 'join') === active) return current.status
  if (intent === 'leave') return 'cancelled'
  return freeSeats > 0 ? 'confirmed' : 'waitlisted'
}
function threadKey(a, b) {
  return [a, b].sort((x, y) => x - y).join(':')
}
module.exports = {
  Problem,
  digest,
  hashPassword,
  verifyPassword,
  sessionToken,
  decide,
  threadKey,
}

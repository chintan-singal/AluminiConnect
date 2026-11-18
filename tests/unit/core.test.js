const {
  decide,
  threadKey,
  sessionToken,
  hashPassword,
  verifyPassword,
} = require('../../server/core')
const { transaction } = require('../../server/db')
test.each([
  ['none', 'join', 1, 'confirmed'],
  ['none', 'join', 0, 'waitlisted'],
  ['none', 'leave', 2, 'none'],
  ['confirmed', 'join', 0, 'confirmed'],
  ['waitlisted', 'join', 0, 'waitlisted'],
  ['confirmed', 'leave', 0, 'cancelled'],
  ['waitlisted', 'leave', 0, 'cancelled'],
  ['cancelled', 'leave', 1, 'cancelled'],
  ['cancelled', 'join', 0, 'waitlisted'],
])('%s + %s with %i free seats gives %s', (status, intent, free, expected) => {
  expect(decide({ revision: 3, status }, intent, 3, free)).toBe(expected)
})
test('stale revisions carry current status', () => {
  expect(() =>
    decide({ revision: 2, status: 'confirmed' }, 'leave', 1, 0),
  ).toThrow('STALE_BOOKING')
})
test('thread key is numeric and stable across both participants', () => {
  expect(threadKey(11, 2)).toBe('2:11')
  expect(threadKey(2, 11)).toBe('2:11')
})
test('session parser respects boundaries', () => {
  const token = 'a'.repeat(64)
  expect(sessionToken()).toBeUndefined()
  expect(sessionToken('x=1; alumni_session=' + token + '; h=2')).toBe(token)
  expect(sessionToken('fake_alumni_session=' + token)).toBeUndefined()
})
test('password hash has a unique salt and verifies only the right password', async () => {
  const hash = await hashPassword('a password')
  expect(await hashPassword('a password')).not.toEqual(hash)
  expect(await verifyPassword('a password', hash)).toBe(true)
  expect(await verifyPassword('wrong', hash)).toBe(false)
  expect(await verifyPassword('wrong', 'invalid')).toBe(false)
})
test.each([
  ['ER_LOCK_DEADLOCK', 3],
  ['OTHER', 1],
])(
  'transaction retries and releases connections for %s',
  async (code, times) => {
    const conn = {
      query: jest.fn(),
      beginTransaction: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      commit: jest.fn(),
    }
    const pool = { getConnection: async () => conn }
    await expect(
      transaction(pool, async () => {
        throw Object.assign(new Error(code), { code })
      }),
    ).rejects.toThrow(code)
    expect(conn.rollback).toHaveBeenCalledTimes(times)
    expect(conn.release).toHaveBeenCalledTimes(times)
    expect(conn.commit).not.toHaveBeenCalled()
  },
)

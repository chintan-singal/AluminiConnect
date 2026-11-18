const { stores, transaction } = require('../../server/db')
test('requires both databases', () =>
  expect(() => stores({})).toThrow('Configure'))
test('retries a deadlock on a fresh connection then returns the committed value', async () => {
  const conn = () => ({
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  })
  const first = conn(),
    second = conn()
  const pool = {
    getConnection: jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second),
  }
  const action = jest
    .fn()
    .mockRejectedValueOnce(
      Object.assign(Error('retry'), { code: 'ER_LOCK_DEADLOCK' }),
    )
    .mockResolvedValueOnce(5)
  expect(await transaction(pool, action)).toBe(5)
  expect(first.rollback).toHaveBeenCalledTimes(1)
  expect(second.commit).toHaveBeenCalledTimes(1)
})

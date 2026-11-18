const { membersStore } = require('../../server/members')
const { eventsStore } = require('../../server/events')
const { contentStore } = require('../../server/content')
const { readBooking } = require('../../server/booking')

test('a missing session requires no database query', async () => {
  const sql = { execute: jest.fn() }
  expect(await membersStore(sql).identify()).toBeNull()
  expect(sql.execute).not.toHaveBeenCalled()
})
test('hidden profiles clear their mentoring topic before persistence', async () => {
  const sql = {
    execute: jest
      .fn()
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id: 4, visible: 0 }]]),
  }
  const result = await membersStore(sql).edit(4, {
    name: 'Alex',
    city: 'Pune',
    field: 'Art',
    visible: false,
    mentorTopic: 'Design',
  })
  expect(sql.execute.mock.calls[0][1]).toEqual([
    'Alex',
    'Pune',
    'Art',
    false,
    '',
    4,
  ])
  expect(result.visible).toBe(0)
})
test('office hours require a visible mentor, but reunions need no mentor lookup', async () => {
  const sql = {
    execute: jest
      .fn()
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 7 }]),
  }
  const data = {
    title: 'Reunion',
    description: 'Meet on campus',
    startsAt: '2099-02-02T10:00:00Z',
    venue: 'Hall',
    capacity: 5,
  }
  const events = eventsStore(sql)
  await expect(
    events.create(2, { ...data, kind: 'office_hours' }),
  ).rejects.toThrow('MENTOR_REQUIRED')
  expect(await events.create(2, { ...data, kind: 'reunion' })).toEqual({
    id: 7,
  })
  expect(sql.execute.mock.calls[1][1].slice(-2)).toEqual([null, 2])
})
test('missing and persisted bookings expose a stable response shape', async () => {
  const saved = { status: 'waitlisted', revision: 2, queuePosition: 1 }
  const sql = {
    execute: jest
      .fn()
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[saved]]),
  }
  expect(await readBooking(sql, 1, 2)).toEqual({
    status: 'none',
    revision: 0,
    queuePosition: null,
  })
  expect(await readBooking(sql, 1, 2)).toEqual(saved)
})
test('message write records identities and display names from resolved members', async () => {
  const insertOne = jest.fn().mockResolvedValue({ insertedId: 'm1' })
  const collection = jest.fn().mockReturnValue({ insertOne })
  const result = await contentStore({ collection }).send(
    { id: 9, name: 'Dev' },
    { id: 2, name: 'Asha' },
    'Hello',
  )
  expect(collection).toHaveBeenCalledWith('messages')
  expect(result).toMatchObject({
    _id: 'm1',
    thread: '2:9',
    senderName: 'Dev',
    recipientName: 'Asha',
    body: 'Hello',
  })
  expect(insertOne).toHaveBeenCalledTimes(1)
})

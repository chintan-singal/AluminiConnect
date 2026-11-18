const React = require('react')
const { render, screen, fireEvent, waitFor } = require('@testing-library/react')
const { CareerListings } = require('../../web/src/Careers')
const h = React.createElement
const job = {
  _id: '1', title: 'Backend Engineer', company: 'Demo Labs', location: 'New Delhi',
  workMode: 'Hybrid', type: 'full_time', field: 'Engineering', description: 'Fictional role description',
  skills: ['Node.js', 'MySQL'], salaryRange: 'Sample compensation',
  posterId: 7, posterName: 'Demo Mentor', closesAt: '2099-01-01T00:00:00Z', synthetic: true,
}
function mock(read) {
  global.fetch = jest.fn(async (url) => ({ ok: true, status: 200, json: async () => read(url) }))
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
})

test('career discovery sends filters and a role opens a credited demo detail with a messaging action', async () => {
  mock(() => [job])
  const chat = jest.fn()
  render(h(CareerListings, { version: 0, chat }))
  await screen.findByText('Backend Engineer')
  fireEvent.change(screen.getByLabelText('Search opportunities'), { target: { value: 'Backend' } })
  fireEvent.change(screen.getByLabelText('Job location'), { target: { value: 'New Delhi' } })
  fireEvent.change(screen.getByLabelText('Employment type'), { target: { value: 'full_time' } })
  await waitFor(() => expect(global.fetch.mock.calls.at(-1)[0]).toBe('/api/jobs?q=Backend&location=New+Delhi&page=1&type=full_time'))
  fireEvent.click(await screen.findByRole('button', { name: 'View Backend Engineer' }))
  expect(screen.getByRole('dialog', { name: job.title })).toBeTruthy()
  expect(screen.queryByText(/organisation, role and compensation are fictional/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View Backend Engineer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Message alumnus' }))
  expect(chat).toHaveBeenCalledWith(7)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('career results paginate and display empty results for a filter with no matches', async () => {
  mock((url) => {
    if (url.includes('q=missing')) return []
    if (url.includes('page=2')) return [{ ...job, synthetic: false }]
    return Array.from({ length: 30 }, (_, index) => ({ ...job, _id: String(index) }))
  })
  render(h(CareerListings, { version: 0 }))
  fireEvent.click(await screen.findByRole('button', { name: 'Next page' }))
  await screen.findByRole('button', { name: 'Previous page' })
  await screen.findByRole('button', { name: 'View Backend Engineer' })
  expect(screen.queryByText('Demo opportunity')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View Backend Engineer' }))
  expect(screen.queryByRole('button', { name: 'Message alumnus' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
  await screen.findByRole('button', { name: 'Next page' })
  fireEvent.change(screen.getByLabelText('Search opportunities'), { target: { value: 'missing' } })
  await screen.findByRole('heading', { name: 'No matching opportunities' })
  expect(global.fetch.mock.calls.at(-1)[0]).toContain('page=1')
})

test('members viewing their own listing cannot start a conversation with themselves', async () => {
  mock(() => [job])
  render(h(CareerListings, { version: 0, memberId: job.posterId, chat: jest.fn() }))
  fireEvent.click(await screen.findByRole('button', { name: 'View Backend Engineer' }))
  expect(screen.getByText('You shared this opportunity.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Message alumnus' })).toBeNull()
})

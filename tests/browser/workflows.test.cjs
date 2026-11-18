const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { once } = require('node:events')
const { chromium } = require('playwright-core')
const { fixture } = require('../fixture')
const { makeApp } = require('../../server/app')

test('alumni publish mentoring and business opportunities, book a session, exchange messages and close a role', { timeout: 90000 }, async () => {
  const f = await fixture()
  const server = http.createServer()
  let browser
  try {
    const [mentor, alumnus] = await f.members(2)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const origin = 'http://127.0.0.1:' + server.address().port
    server.on('request', makeApp(f.db, { origin }))
    const executablePath = process.env.BROWSER_PATH || [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/google-chrome', '/usr/bin/chromium',
    ].find(fs.existsSync)
    browser = await chromium.launch({ headless: true, executablePath })
    const errors = []
    async function signIn(member) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(origin)
      await page.getByLabel('Email', { exact: true }).fill(member.email)
      await page.getByLabel('Password', { exact: true }).fill(f.password)
      await page.getByRole('button', { name: /^Sign in/ }).click()
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor()
      return page
    }
    const owner = await signIn(mentor)
    const attendee = await signIn(alumnus)
    const navigate = (page, name) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name, exact: true }).click()
    await navigate(owner, 'Mentors')
    await owner.getByRole('button', { name: 'Publish office hours' }).click()
    await owner.getByLabel('Session title').fill('Career planning session')
    await owner.getByLabel('Session description').fill('Bring your career questions.')
    await owner.getByLabel('Starts in your local time').fill('2099-01-01T10:00')
    await owner.getByLabel('Meeting location or link').fill('Online')
    await owner.getByRole('button', { name: 'Publish session' }).click()
    await owner.getByRole('button', { name: 'Attendees for Career planning session' }).waitFor()
    await navigate(attendee, 'Mentors')
    await attendee.getByLabel('Name', { exact: true }).fill(mentor.name)
    await attendee.getByRole('button', { name: 'View office hours' }).click()
    await attendee.getByRole('button', { name: /Career planning session/ }).click()
    await attendee.getByRole('button', { name: 'Reserve or join waitlist' }).click()
    await attendee.getByText('Seat confirmed', { exact: true }).waitFor()
    await attendee.getByRole('button', { name: 'Close dialog' }).click()
    await navigate(attendee, 'My schedule')
    await attendee.getByRole('button', { name: /Career planning session/ }).waitFor()
    await owner.getByRole('button', { name: 'Attendees for Career planning session' }).click()
    await owner.getByText(alumnus.name + ' · confirmed', { exact: true }).waitFor()
    await owner.getByRole('button', { name: 'Close dialog' }).click()
    await navigate(owner, 'Careers')
    await owner.getByRole('button', { name: 'Post an opportunity' }).click()
    for (const [label, value] of Object.entries({
      'Role title': 'Platform Engineer', 'Business name': 'Alumni Systems', Location: 'New Delhi',
      'Professional field': 'Engineering', 'Role description': 'Build dependable APIs and database services.',
      'Skills, separated by commas': 'Node.js, MySQL', Compensation: 'INR 10-14 lakh',
      'Applications close in your local time': '2099-01-01T10:00',
    })) await owner.getByLabel(label, { exact: true }).fill(value)
    await owner.getByRole('checkbox').check()
    await owner.getByRole('button', { name: 'Publish opportunity' }).click()
    await owner.getByRole('button', { name: 'View Platform Engineer' }).waitFor()
    await navigate(attendee, 'Careers')
    await attendee.getByRole('button', { name: 'View Platform Engineer' }).click()
    await attendee.getByRole('button', { name: 'Message alumnus' }).click()
    await attendee.getByLabel('Message', { exact: true }).fill('I would like to learn more about the role.')
    await attendee.getByRole('button', { name: 'Send message' }).click()
    await attendee.getByText('I would like to learn more about the role.', { exact: true }).waitFor()
    await navigate(owner, 'Messenger')
    await owner.locator('.conversation-list button').first().click()
    await owner.getByText('I would like to learn more about the role.', { exact: true }).waitFor()
    await navigate(owner, 'Careers')
    await owner.getByRole('button', { name: 'My postings', exact: true }).click()
    await owner.getByRole('button', { name: 'View Platform Engineer' }).click()
    await owner.getByRole('button', { name: 'Edit opportunity' }).click()
    await owner.getByLabel('Role title').fill('Senior Platform Engineer')
    await owner.getByRole('button', { name: 'Save changes' }).click()
    await owner.getByRole('button', { name: 'View Senior Platform Engineer' }).click()
    await owner.getByRole('button', { name: 'Close listing' }).click()
    await owner.getByText('Closed', { exact: true }).waitFor()
    if (process.env.TEST_OUTPUT_DIR) {
      const folder = path.join(process.env.TEST_OUTPUT_DIR, 'screenshots')
      fs.mkdirSync(folder, { recursive: true })
      await owner.screenshot({ path: path.join(folder, 'business-owner-postings.png'), animations: 'disabled' })
    }
    await navigate(attendee, 'Announcements')
    await navigate(attendee, 'Careers')
    await attendee.getByRole('heading', { name: 'No matching opportunities' }).waitFor()
    assert.deepEqual(errors, [])
  } finally {
    await browser?.close()
    server.closeAllConnections()
    if (server.listening) await new Promise((resolve) => server.close(resolve))
    await f.close()
  }
})

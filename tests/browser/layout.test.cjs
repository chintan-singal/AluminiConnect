const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { once } = require('node:events')
const express = require('express')
const { chromium } = require('playwright-core')

test(
  'sidebar destinations, saved themes and responsive layouts work through the compiled client',
  { timeout: 90000 },
  async () => {
    const app = express()
    app.use(express.static(path.resolve('dist')))
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    let browser
    const errors = []
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'assembly-ui-'))
    try {
      const executablePath =
        process.env.BROWSER_PATH ||
        [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
        ].find(fs.existsSync)
      browser = await chromium.launch({ headless: true, executablePath })
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      })
      async function readyForScreenshot() {
        await page.locator('img').evaluateAll(async images => {
          for (const image of images) image.loading = 'eager'
          await Promise.all(images.map(image => image.decode()))
        })
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      }
      let anonymous = false
      page.on('pageerror', (error) => errors.push(error.message))
      const member = {
        id: 1,
        name: 'Asha Bose',
        batch: 2020,
        city: 'New Delhi',
        field: 'Product designer',
        mentorTopic: 'Portfolio reviews',
        visible: 1,
        role: 'organizer',
        status: 'approved',
      }
      const mentor = {
        ...member,
        id: 2,
        name: 'Arjun Mehta',
        field: 'Software engineer',
        mentorTopic: 'Career guidance',
      }
      const event = {
        id: 1,
        title: 'Annual alumni reunion',
        description:
          'An afternoon with the people who made campus feel like home.',
        startsAt: '2099-12-12T11:00:00Z',
        venue: 'Main campus',
        capacity: 80,
        available: 24,
        kind: 'reunion',
      }
      const notices = {
        items: [
          {
            _id: '1',
            title: 'A new chapter for our alumni community',
            body: 'Reconnect with classmates, meet a mentor, and discover your next campus gathering. We look forward to welcoming you back.',
            authorName: 'Alumni office',
          },
          {
            _id: '2',
            title: 'Make a little time for the next generation',
            body: 'Share your experience with alumni taking their next step. Add a mentoring topic to your profile to get started.',
            authorName: 'Community team',
          },
        ],
        next: null,
      }
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url())
        let body
        if (url.pathname === '/api/me' && anonymous)
          return route.fulfill({
            status: 401,
            json: { code: 'SIGN_IN_REQUIRED' },
          })
        if (url.pathname === '/api/me') body = member
        else if (url.pathname === '/api/events/1')
          body = {
            ...event,
            booking: { status: 'none', revision: 0, queuePosition: null },
          }
        else if (url.pathname === '/api/events/1/rsvp')
          body = { status: 'confirmed', revision: 1, queuePosition: null }
        else if (url.pathname === '/api/events')
          body = url.searchParams.get('period') === 'past' ? [] : [event]
        else if (url.pathname === '/api/announcements') body = notices
        else if (url.pathname === '/api/members') body = [mentor]
        else if (url.pathname === '/api/me/bookings')
          body = [
            { ...event, status: 'confirmed', revision: 1, queuePosition: null },
          ]
        else if (url.pathname === '/api/messages') body = []
        else if (url.pathname === '/api/jobs') body = []
        else if (url.pathname === '/api/applications') body = []
        else if (url.pathname === '/api/auth/logout') {
          anonymous = true
          return route.fulfill({ status: 204 })
        } else throw new Error('Unexpected UI request ' + url.pathname)
        return route.fulfill({ json: body })
      })
      const origin = 'http://127.0.0.1:' + server.address().port
      await page.goto(origin)
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor()
      assert.equal(
        await page.locator('html').getAttribute('data-theme'),
        'dark',
      )
      await readyForScreenshot()
      await page.screenshot({
        path: path.join(screenshots, 'dashboard-dark.png'),
        fullPage: true,
        animations: 'disabled',
      })
      const destinations = [
        ['Dashboard', /Welcome back/],
        ['Events', 'Events & reunions'],
        ['Announcements', 'Announcements'],
        ['Donations', 'Donations'],
        ['Messenger', 'Messenger'],
        ['Careers', 'Career opportunities'],
        ['Mentors', 'Mentors Hub'],
        ['Gallery', 'Campus & community'],
        ['Alumni directory', 'Alumni directory'],
        ['My schedule', 'My schedule'],
        ['Organizer desk', 'Organizer desk'],
        ['Profile & settings', 'My profile'],
        ['Our university', 'Rooted in South Asia. Open to the world.'],
      ]
      for (const theme of ['dark', 'light']) {
        for (const width of [1440, 768, 390]) {
          await page.setViewportSize({ width, height: 1000 })
          for (const [label, heading] of destinations) {
            if (width < 761)
              await page
                .getByRole('button', { name: 'Open menu', exact: true })
                .click()
            const link = page
              .locator('.sidebar')
              .getByRole('button', { name: label, exact: true, includeHidden: true })
            await link.click()
            assert.equal(await link.getAttribute('aria-current'), 'page')
            await page
              .getByRole('heading', { name: heading, level: 1 })
              .waitFor()
            if (theme === 'dark' && width === 1440 && ['Gallery','Alumni directory','Events','Our university'].includes(label)) {
              await readyForScreenshot()
              await page.screenshot({path:path.join(screenshots,label.replaceAll(' ','-').toLowerCase()+'.png'),fullPage:true,animations:'disabled'})
            }
            if (label === 'Gallery' && width === 1440) {
              await page
                .getByRole('button', {
                  name: 'View A home for South Asian scholarship',
                  exact: true,
                })
                .click()
              await page.getByRole('dialog').waitFor()
              await page.keyboard.press('Escape')
              assert.equal(await page.getByRole('dialog').count(), 0)
            }
            if (label === 'Alumni directory' && width === 1440) {
              await page
                .getByRole('button', { name: 'View profile', exact: true })
                .click()
              await page.getByRole('dialog', { name: mentor.name }).waitFor()
              await page.getByRole('button', { name: 'Close dialog' }).click()
            }
            if (label === 'Events' && width === 1440) {
              await page
                .getByRole('button', { name: 'Past events', exact: true })
                .click()
              await page
                .getByRole('heading', { name: 'No past events' })
                .waitFor()
              await page
                .getByRole('button', { name: 'Upcoming events', exact: true })
                .click()
            }
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
              theme + ' overflow in ' + label + ' at ' + width,
            )
          }
          await page
            .getByRole('button', { name: 'Open profile', exact: true })
            .click()
          await page
            .getByRole('button', {
              name: theme === 'dark' ? 'Dark' : 'Light',
              exact: true,
            })
            .click()
          await readyForScreenshot()
          await page.screenshot({
            path: path.join(
              screenshots,
              'profile-' + theme + '-' + width + '.png',
            ),
            fullPage: true,
            animations: 'disabled',
          })
          if (width === 390) {
            await page
              .getByRole('button', { name: 'Open menu', exact: true })
              .click()
            await page.keyboard.press('Escape')
            assert.equal(
              await page
                .getByRole('button', { name: 'Open menu', exact: true })
                .getAttribute('aria-expanded'),
              'false',
            )
          }
        }
        if (theme === 'dark') {
          await page.getByRole('button', { name: 'Light', exact: true }).click()
          assert.equal(
            await page.locator('html').getAttribute('data-theme'),
            'light',
          )
          await page.reload()
          await page.getByRole('heading', { name: /Welcome back/ }).waitFor()
          assert.equal(
            await page.locator('html').getAttribute('data-theme'),
            'light',
          )
          await page.setViewportSize({ width: 1440, height: 1000 })
          await readyForScreenshot()
          await page.screenshot({
            path: path.join(screenshots, 'dashboard-light.png'),
            fullPage: true,
            animations: 'disabled',
          })
        }
      }
      const requestsBefore = errors.length
      await page.setViewportSize({ width: 390, height: 850 })
      await page.getByRole('button', { name: 'Open profile' }).click()
      await page.getByRole('button', { name: 'Dark', exact: true }).click()
      await page.reload()
      await page.getByRole('heading', { name: /Welcome back/ }).waitFor()
      assert.equal(
        await page.locator('html').getAttribute('data-theme'),
        'dark',
      )
      assert.equal(requestsBefore, 0)
      assert.deepEqual(errors, [])
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await page
        .locator('.sidebar')
        .getByRole('button', { name: 'Sign out', exact: true })
        .click()
      await page
        .getByRole('heading', { name: 'Member sign in', exact: true })
        .waitFor()
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 })
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        await readyForScreenshot()
        await page.screenshot({
          path: path.join(screenshots, 'welcome-' + width + '.png'),
          fullPage: true,
          animations: 'disabled',
        })
      }
      await page
        .getByRole('button', { name: 'Sources & image credits', exact: true })
        .click()
      await page
        .getByRole('heading', { name: 'Sources & image credits', level: 1 })
        .waitFor()
      assert.deepEqual(
        await page
          .locator('img')
          .evaluateAll((images) =>
            images
              .filter((image) => image.complete && !image.naturalWidth)
              .map((image) => image.src),
          ),
        [],
      )
      console.log(
        'Verified 13 destinations at 3 viewport widths in both themes. Screenshots saved to ' +
          screenshots,
      )
    } finally {
      await browser?.close()
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  },
)

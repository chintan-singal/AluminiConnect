const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const { once } = require('node:events')
const { chromium } = require('playwright-core')
const { fixture } = require('../fixture')
const { makeApp } = require('../../server/app')

test(
  'two signed-in browsers reserve, join the queue, and see the committed handoff',
  { timeout: 90000 },
  async () => {
    assert.ok(
      fs.existsSync('dist/index.html'),
      'Run npm run build before the browser test',
    )
    const f = await fixture()
    const server = http.createServer()
    let browser
    try {
      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      const origin = 'http://127.0.0.1:' + server.address().port
      server.on('request', makeApp(f.db, { origin }))
      const [first, second] = await f.members(2)
      await f.event(first)
      const executablePath =
        process.env.BROWSER_PATH ||
        [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
        ].find(fs.existsSync)
      browser = await chromium.launch({ headless: true, executablePath })
      async function open(member, width) {
        const page = await browser.newPage({ viewport: { width, height: 850 } })
        await page.goto(origin)
        await page.getByLabel('Email', { exact: true }).fill(member.email)
        await page.getByLabel('Password', { exact: true }).fill(f.password)
        await page.getByRole('button', { name: /^Sign in/ }).click()
        if (width < 761)
          await page.getByRole('button', { name: 'Open menu' }).click()
        await page
          .getByRole('navigation', { name: 'Main' })
          .getByRole('button', { name: 'Events', exact: true })
          .click()
        await page.getByRole('button', { name: /Portfolio review/ }).click()
        await page
          .getByRole('button', { name: 'Reserve or join waitlist' })
          .click()
        return page
      }
      const desktop = await open(first, 1280)
      await desktop.getByText('Seat confirmed', { exact: true }).waitFor()
      const mobile = await open(second, 390)
      await mobile.getByText('Waitlist position 1', { exact: true }).waitFor()
      assert.ok(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await desktop.getByRole('button', { name: 'Release my seat' }).click()
      await desktop
        .getByRole('button', { name: 'Reserve or join waitlist' })
        .waitFor()
      await mobile.getByRole('button', { name: 'Close dialog' }).click()
      await mobile.getByRole('button', { name: 'Open menu' }).click()
      await mobile
        .getByRole('button', { name: 'My schedule', exact: true })
        .click()
      await mobile.getByRole('button', { name: /Portfolio review/ }).click()
      await mobile.getByText('Seat confirmed', { exact: true }).waitFor()
    } finally {
      await browser?.close()
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      await f.close()
    }
  },
)

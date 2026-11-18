const { performance } = require('node:perf_hooks')
const { fixture } = require('../tests/fixture')
const { once } = require('node:events')
const http = require('node:http')
const { fork } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { seedDemo } = require('./seed-demo')
function clientRequest(url, member, init = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        agent: member.agent,
        method: init.method || 'GET',
        headers: { 'Content-Type': 'application/json', Cookie: member.cookie },
        signal: AbortSignal.timeout(60000),
      },
      (res) => {
        const chunks = []
        res.on('error', reject)
        res.on('data', (part) => chunks.push(part))
        res.on('end', () => {
          try {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: JSON.parse(Buffer.concat(chunks).toString()),
            })
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    req.on('error', reject)
    req.end(init.body)
  })
}
async function wave(label, members, run, budget) {
  const start = performance.now()
  const samples = await Promise.all(
    members.map(async (member, index) => {
      const at = performance.now()
      try {
        const response = await run(member, index)
        return {
          ms: performance.now() - at,
          ok: response.ok,
          data: response.data,
        }
      } catch (e) {
        return {
          ms: performance.now() - at,
          ok: false,
          data: { code: e.code || e.message },
        }
      }
    }),
  )
  const elapsed = performance.now() - start
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b)
  const pct = (p) => Math.round(sorted[Math.ceil(p * sorted.length) - 1])
  const failures = samples.filter((s) => !s.ok)
  console.log(
    JSON.stringify({
      wave: label,
      users: members.length,
      errors: failures.length,
      p50ms: pct(0.5),
      p95ms: pct(0.95),
      p99ms: pct(0.99),
      requestsPerSecond: Math.round((1000 * members.length) / elapsed),
      elapsedMs: Math.round(elapsed),
      p95BudgetMs: budget,
    }),
  )
  if (process.env.TEST_OUTPUT_DIR) {
    const filename = (process.env.TEST_RUN_PREFIX || 'load') + '-' + label.replaceAll(' ', '-') + '-samples.json'
    fs.writeFileSync(path.join(process.env.TEST_OUTPUT_DIR, filename), JSON.stringify(samples.map((sample, index) => ({
      request: index + 1, durationMs: Number(sample.ms.toFixed(2)), ok: sample.ok,
      result: Array.isArray(sample.data) ? { items: sample.data.length } : sample.data?.items ? { items: sample.data.items.length } : sample.data,
    })), null, 2))
  }
  if (failures.length || pct(0.95) > budget) {
    process.exitCode = 1
    console.error(
      label + ' missed its error or latency target',
      failures[0]?.data || '',
    )
  }
  return samples.map((s) => s.data)
}
async function main() {
  const count = Number(process.env.LOAD_USERS || 1000),
    budget = Number(process.env.LOAD_P95_MS || 10000)
  if (!Number.isInteger(count) || count < 2 || count > 2000 || !(budget > 0))
    throw new Error('Invalid load settings')
  const f = await fixture()
  let server,
    clients = []
  try {
    const members = await f.members(count),
      event = await f.event(members[0])
    clients = members
    await seedDemo(f.db)
    await f.db.mongo.collection('announcements').insertOne({
      title: 'Alumni weekend',
      body: 'Bookings open.',
      publishedAt: new Date(),
    })
    server = fork(require.resolve('../server/start'), [], {
      env: { ...process.env, ...f.config, HOST: '127.0.0.1', PORT: '0' },
      execArgv: [],
      windowsHide: true,
    })
    const [address] = await Promise.race([
      once(server, 'message'),
      once(server, 'exit').then(() => {
        throw new Error('API exited before readiness')
      }),
    ])
    const url = 'http://127.0.0.1:' + address.port + '/api'
    const request = (member, path, init = {}) =>
      clientRequest(url + path, member, init)
    for (let offset = 0; offset < count; offset += 25) {
      await Promise.all(
        members.slice(offset, offset + 25).map(async (member) => {
          member.agent = new http.Agent({ keepAlive: true, maxSockets: 1 })
          if (
            process.env.LOAD_COLD !== '1' &&
            !(await request(member, '/me')).ok
          )
            throw new Error('Session warmup failed')
        }),
      )
    }
    const bookings = await wave(
      'one-seat burst',
      members,
      (member) =>
        request(member, '/events/' + event + '/rsvp', {
          method: 'PUT',
          body: JSON.stringify({ intent: 'join', expectedRevision: 0 }),
        }),
      budget,
    )
    const winners = bookings.filter((b) => b.status === 'confirmed')
    const waiting = bookings.filter((b) => b.status === 'waitlisted')
    if (
      winners.length !== 1 ||
      waiting.length !== count - 1 ||
      new Set(waiting.map((b) => b.queuePosition)).size !== count - 1
    ) {
      process.exitCode = 1
      console.error('Final-seat response invariant failed')
    }
    const [[counts]] = await f.db.sql.query(
      "SELECT COUNT(*) AS total,SUM(status='confirmed') AS seats,SUM(status='waitlisted') AS waiting,COUNT(DISTINCT ticket) AS tickets FROM bookings WHERE event_id=?",
      [event],
    )
    if (
      counts.total !== count ||
      Number(counts.seats) !== 1 ||
      Number(counts.waiting) !== count - 1 ||
      counts.tickets !== count - 1
    ) {
      process.exitCode = 1
      console.error('Persistent seat or queue invariant failed')
    }
    console.log(
      JSON.stringify({
        confirmed: Number(counts.seats),
        waitlisted: Number(counts.waiting),
        distinctTickets: counts.tickets,
      }),
    )
    const reads = ['/events?kind=office_hours', '/announcements', '/me/bookings', '/messages', '/jobs', '/members?mentor=true']
    await wave(
      'mixed reads',
      members,
      (member, i) => request(member, reads[i % reads.length]),
      budget,
    )
    if (!(await (await fetch(url + '/health')).json()).ready)
      throw new Error('Databases unavailable after load')
    console.log('Post-load health passed')
  } finally {
    for (const member of clients) member.agent?.destroy()
    if (server?.connected) {
      const closed = once(server, 'exit')
      server.disconnect()
      await closed
    }
    await f.close()
  }
}
main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})

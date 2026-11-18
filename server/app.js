const express = require('express')
const path = require('node:path')
const { z } = require('zod')
const { Problem, sessionToken } = require('./core')
const { membersStore } = require('./members')
const { eventsStore } = require('./events')
const { contentStore } = require('./content')
const id = z.coerce.number().int().positive().max(4294967295)
const str = (n) => z.string().trim().min(1).max(n)
const batch = z.coerce.number().int().min(1900).max(new Date().getFullYear())
const email = z.email().max(254)
const page = z.coerce.number().int().min(1).max(10000).optional()
const kind = z.enum(['reunion', 'office_hours'])
const credentials = z.object({ email, password: z.string().min(1).max(256) })
const profile = z.object({
  name: str(100),
  city: z.string().trim().max(100),
  field: z.string().trim().max(120),
  visible: z.boolean(),
  mentorTopic: z.string().trim().max(160),
})
const event = z.object({
  title: str(160),
  description: str(4000),
  kind,
  startsAt: z.iso.datetime({ offset: true }),
  venue: str(180),
  capacity: z.number().int().min(1).max(10000),
  mentorId: id.optional(),
})
const job = z.object({
  title: str(160), company: str(120), location: str(100),
  workMode: z.enum(['Remote', 'Hybrid', 'On-site']),
  type: z.enum(['full_time', 'internship', 'contract']),
  field: str(120), description: str(8000),
  skills: z.array(str(40)).min(1).max(15), salaryRange: str(120),
  businessOwner: z.literal(true),
  closesAt: z.iso.datetime({ offset: true }).refine((value) => Date.parse(value) > Date.now()),
}).strict()
function makeApp(db, options = {}) {
  const members = membersStore(db.sql),
    events = eventsStore(db.sql),
    content = contentStore(db.mongo)
  const app = express(),
    api = express.Router()
  const origin = options.origin || 'http://localhost:3000'
  const cookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/',
  }
  app.disable('x-powered-by')
  app.use(
    '/api',
    (req, res, next) => {
      res.set('Cache-Control', 'no-store')
      if (
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
        req.headers.origin &&
        req.headers.origin !== origin
      )
        return next(new Problem(403, 'ORIGIN_DENIED'))
      next()
    },
    express.json({ limit: '512kb' }),
    api,
  )
  const loginAttempts = new Map()
  function rateLimit(req, res, next) {
    const now = Date.now()
    for (const [key, bucket] of loginAttempts)
      if (bucket.until <= now) loginAttempts.delete(key)
    const bucket = loginAttempts.get(req.ip) || { count: 0, until: now + 60000 }
    loginAttempts.set(req.ip, bucket)
    if (++bucket.count > 30) return next(new Problem(429, 'TRY_LATER'))
    next()
  }
  api.get('/health', async (req, res) => {
    await Promise.all([db.sql.query('SELECT 1'), db.mongo.command({ ping: 1 })])
    res.json({ ready: true })
  })
  api.post('/auth/register', rateLimit, async (req, res) =>
    res.status(201).json(
      await members.register(
        credentials
          .extend({
            password: z.string().min(10).max(256),
            name: str(100),
            batch,
          })
          .parse(req.body),
      ),
    ),
  )
  api.post('/auth/login', rateLimit, async (req, res) => {
    const token = await members.login(credentials.parse(req.body))
    res
      .cookie('alumni_session', token, { ...cookie, maxAge: 7 * 86400000 })
      .sendStatus(204)
  })
  api.use(async (req, res, next) => {
    req.token = sessionToken(req.headers.cookie)
    req.member = await members.identify(req.token)
    if (!req.member) throw new Problem(401, 'SIGN_IN_REQUIRED')
    next()
  })
  api.post('/auth/logout', async (req, res) => {
    await members.logout(req.token)
    res.clearCookie('alumni_session', cookie).sendStatus(204)
  })
  api.get('/me', async (req, res) =>
    res.json(await members.profile(req.member.id)),
  )
  api.use((req, res, next) =>
    req.member.status === 'approved'
      ? next()
      : next(new Problem(403, 'APPROVAL_REQUIRED')),
  )
  function organizer(req, res, next) {
    return req.member.role === 'organizer'
      ? next()
      : next(new Problem(403, 'ORGANIZER_REQUIRED'))
  }
  api.patch('/me', async (req, res) =>
    res.json(await members.edit(req.member.id, profile.parse(req.body))),
  )
  api.get('/members', async (req, res) =>
    res.json(
      await members.directory(
        z
          .object({
            q: z.string().max(100).optional(),
            batch: batch.optional(),
            mentor: z.literal('true').optional(),
            city: z.string().trim().max(100).optional(),
            field: z.string().trim().max(120).optional(),
            page,
          })
          .parse(req.query),
      ),
    ),
  )
  api.get('/applications', organizer, async (req, res) =>
    res.json(await members.applications()),
  )
  api.patch('/applications/:id', organizer, async (req, res) =>
    res.json(
      await members.review(
        id.parse(req.params.id),
        z.enum(['approved', 'declined']).parse(req.body?.status),
      ),
    ),
  )
  api.get('/events', async (req, res) =>
    res.json(
      await events.list(
        z
          .object({
            kind: kind.optional(),
            mentorId: id.optional(),
            period: z.enum(['upcoming', 'past']).optional(),
            page,
          })
          .parse(req.query),
      ),
    ),
  )
  api.post('/events', organizer, async (req, res) =>
    res
      .status(201)
      .json(await events.create(req.member.id, event.parse(req.body))),
  )
  api.post('/mentor-sessions', async (req, res) => {
    const data = event.omit({ kind: true, mentorId: true }).parse(req.body)
    res.status(201).json(await events.create(req.member.id, {
      ...data, kind: 'office_hours', mentorId: req.member.id,
    }))
  })
  api.get('/events/:id', async (req, res) =>
    res.json(await events.detail(id.parse(req.params.id), req.member.id)),
  )
  api.put('/events/:id/rsvp', async (req, res) => {
    const { intent, expectedRevision } = z
      .object({
        intent: z.enum(['join', 'leave']),
        expectedRevision: z.number().int().min(0),
      })
      .parse(req.body)
    res.json(
      await events.reserve(
        id.parse(req.params.id),
        req.member.id,
        intent,
        expectedRevision,
      ),
    )
  })
  api.get('/events/:id/roster', async (req, res) =>
    res.json(await events.roster(id.parse(req.params.id), req.member)),
  )
  api.get('/me/bookings', async (req, res) =>
    res.json(await events.schedule(req.member.id)),
  )
  const cursor = (req) => z.string().optional().parse(req.query.before)
  api.get('/jobs', async (req, res) => {
    const filters = z.object({
      q: z.string().trim().max(120).optional(),
      location: z.string().trim().max(100).optional(),
      type: z.enum(['full_time', 'internship', 'contract']).optional(),
      mine: z.literal('true').optional(),
      page,
    }).parse(req.query)
    res.json(await content.jobs({ ...filters, memberId: req.member.id }))
  })
  api.post('/jobs', async (req, res) =>
    res.status(201).json(await content.publishJob(req.member, job.parse(req.body))),
  )
  api.patch('/jobs/:key', async (req, res) => {
    const key = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.key)
    const changes = job.partial().extend({ status: z.enum(['open', 'closed']).optional() })
      .refine((value) => Object.keys(value).length > 0).parse(req.body)
    res.json(await content.updateJob(req.member.id, key, changes))
  })
  api.get('/announcements', async (req, res) =>
    res.json(await content.announcements(cursor(req))),
  )
  api.post('/announcements', organizer, async (req, res) => {
    const data = z.object({ title: str(160), body: str(50000) }).parse(req.body)
    res
      .status(201)
      .json(await content.publish(req.member, data.title, data.body))
  })
  api.get('/messages/:peer', async (req, res) =>
    res.json(
      await content.messages(
        req.member.id,
        id.parse(req.params.peer),
        cursor(req),
      ),
    ),
  )
  api.get('/messages', async (req, res) =>
    res.json(
      await content.inbox(req.member.id, page.parse(req.query.page) || 1),
    ),
  )
  api.post('/messages/:peer', async (req, res) => {
    const peer = id.parse(req.params.peer),
      body = str(32000).parse(req.body?.body)
    if (peer === req.member.id) throw new Problem(422, 'CHOOSE_ANOTHER_MEMBER')
    const recipient = await members.peer(peer)
    if (
      !recipient.visible &&
      !(await content.existingThread(req.member.id, peer))
    ) {
      throw new Problem(404, 'MEMBER_UNAVAILABLE')
    }
    res.status(201).json(await content.send(req.member, recipient, body))
  })
  api.use((req, res) => res.status(404).json({ code: 'ROUTE_MISSING' }))
  app.use(express.static(path.join(__dirname, '../dist')))
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(422).json({
        code: 'INVALID_FIELDS',
        fields: err.issues.map((x) => x.path.join('.')),
      })
    if (err instanceof Problem)
      return res
        .status(err.status)
        .json({ code: err.code, current: err.details })
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ code: 'ALREADY_EXISTS' })
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')
      return res.status(err.status).json({ code: 'INVALID_BODY' })
    if (options.logError !== false)
      console.error(err.name, err.code || err.message)
    res.status(503).json({ code: 'SERVICE_UNAVAILABLE' })
  })
  return app
}
module.exports = { makeApp }

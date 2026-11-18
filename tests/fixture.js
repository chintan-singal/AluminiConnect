const mysql = require('mysql2/promise')
const crypto = require('node:crypto')
const { stores, initialize } = require('../server/db')
const { digest, hashPassword } = require('../server/core')
const { makeApp } = require('../server/app')

async function fixture() {
  const sqlUrl = new URL(
    process.env.TEST_MYSQL_URL ||
      'mysql://root:local_test_root@127.0.0.1:3306/',
  )
  const mongoUrl = new URL(
    process.env.TEST_MONGO_URL || 'mongodb://127.0.0.1:27017',
  )
  if (
    ![sqlUrl, mongoUrl].every((url) =>
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
    )
  )
    throw new Error('Tests require local disposable databases')
  const name = 'alumni_test_' + crypto.randomBytes(10).toString('hex')
  sqlUrl.pathname = '/'
  const admin = await mysql.createConnection(sqlUrl.href)
  try {
    await admin.query('CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4')
  } finally {
    await admin.end()
  }
  sqlUrl.pathname = '/' + name
  const config = {
    MYSQL_URL: sqlUrl.href,
    MONGO_URL: mongoUrl.href,
    MONGO_DB: name,
  }
  const db = stores(config)
  async function close() {
    try {
      await db.mongo.dropDatabase()
    } finally {
      try {
        await db.sql.query('DROP DATABASE ' + name)
      } finally {
        await db.close()
      }
    }
  }
  try {
    await initialize(db)
    const app = makeApp(db, { logError: false })
    const password = 'alumni-fixture-password'
    const hash = await hashPassword(password)
    async function members(count, role = 'member') {
      const inputs = Array.from({ length: count }, () => {
        const key = crypto.randomBytes(12).toString('hex')
        return {
          name: 'Alum ' + key,
          email: key + '@example.test',
          token: crypto.randomBytes(32).toString('hex'),
        }
      })
      await db.sql.query(
        'INSERT INTO members(name,email,batch,password_hash,role,status,visible,mentor_topic) VALUES ?',
        [
          inputs.map((m) => [
            m.name,
            m.email,
            2020,
            hash,
            role,
            'approved',
            1,
            'Design',
          ]),
        ],
      )
      const [rows] = await db.sql.query(
        'SELECT id,email FROM members WHERE email IN (?)',
        [inputs.map((m) => m.email)],
      )
      const ids = new Map(rows.map((m) => [m.email, m.id]))
      for (const m of inputs) {
        m.id = ids.get(m.email)
        m.cookie = 'alumni_session=' + m.token
      }
      await db.sql.query(
        'INSERT INTO sessions(digest,member_id,expires_at) VALUES ?',
        [
          inputs.map((m) => [
            digest(m.token),
            m.id,
            new Date(Date.now() + 3600000),
          ]),
        ],
      )
      return inputs
    }
    async function event(owner, capacity = 1) {
      const [res] = await db.sql.execute(
        "INSERT INTO events(title,kind,description,venue,capacity,creator_id,starts_at) VALUES ('Portfolio review','reunion','Bring a portfolio','Studio',?,?,UTC_TIMESTAMP()+INTERVAL 1 DAY)",
        [capacity, owner.id],
      )
      return res.insertId
    }
    return { db, config, app, close, members, event, password }
  } catch (e) {
    await close()
    throw e
  }
}
module.exports = { fixture }

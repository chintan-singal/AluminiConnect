const fs = require('node:fs/promises')
const path = require('node:path')
const mysql = require('mysql2/promise')
const { MongoClient } = require('mongodb')

function stores(env = process.env) {
  if (!env.MYSQL_URL || !env.MONGO_URL || !env.MONGO_DB) {
    throw new Error('Configure MYSQL_URL, MONGO_URL and MONGO_DB')
  }
  const sql = mysql.createPool({
    uri: env.MYSQL_URL,
    connectionLimit: 16,
    queueLimit: 2500,
    timezone: 'Z',
    dateStrings: false,
    charset: 'utf8mb4',
  })
  const client = new MongoClient(env.MONGO_URL, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 4000,
  })
  const mongo = client.db(env.MONGO_DB)
  return { sql, mongo, close: () => Promise.all([sql.end(), client.close()]) }
}
async function initialize({ sql, mongo }) {
  const ddl = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8')
  for (const statement of ddl
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean))
    await sql.query(statement)
  await mongo.collection('messages').createIndex({ thread: 1, _id: -1 })
  await mongo.collection('messages').createIndex({ senderId: 1, _id: -1 })
  await mongo.collection('messages').createIndex({ recipientId: 1, _id: -1 })
  await mongo
    .collection('announcements')
    .createIndex({ publishedAt: -1, _id: -1 })
  await mongo.collection('jobs').createIndex({ status: 1, closesAt: 1 })
}
async function transaction(pool, work) {
  for (let attempt = 0; ; attempt++) {
    const conn = await pool.getConnection()
    try {
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
      await conn.beginTransaction()
      const result = await work(conn)
      await conn.commit()
      return result
    } catch (error) {
      await conn.rollback()
      if (error.code !== 'ER_LOCK_DEADLOCK' || attempt >= 2) throw error
    } finally {
      conn.release()
    }
  }
}
module.exports = { stores, initialize, transaction }

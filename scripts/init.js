const { stores, initialize } = require('../server/db')
const { hashPassword } = require('../server/core')
async function main() {
  const db = stores()
  try {
    await initialize(db)
    const email = process.env.ORGANIZER_EMAIL,
      password = process.env.ORGANIZER_PASSWORD
    if (email && password) {
      if (password.length < 10)
        throw new Error('Organizer password requires 10 characters')
      const [[existing]] = await db.sql.execute(
        'SELECT role FROM members WHERE email=?',
        [email],
      )
      if (existing && existing.role !== 'organizer')
        throw new Error('Organizer address belongs to a member')
      if (!existing)
        await db.sql.execute(
          "INSERT INTO members(name,email,batch,password_hash,role,status) VALUES ('Alumni Office',?,2000,?,'organizer','approved')",
          [email, await hashPassword(password)],
        )
    }
    console.log('Database initialization complete')
  } finally {
    await db.close()
  }
}
main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})

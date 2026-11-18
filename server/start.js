const { stores } = require('./db')
const { makeApp } = require('./app')
const db = stores()
const port = Number(process.env.PORT || 3000)
const server = makeApp(db, {
  origin: process.env.APP_ORIGIN || 'http://localhost:' + port,
}).listen({ port, host: process.env.HOST, backlog: 2048 }, (error) => {
  if (error) {
    console.error('Unable to start alumni portal:', error.code || error.message)
    process.exitCode = 1
    void db.close().catch(console.error)
    return
  }
  const actualPort = server.address().port
  console.log('Alumni portal listening on port', actualPort)
  process.send?.({ port: actualPort })
})
server.keepAliveTimeout = 120000
function stop() {
  server.close(() => db.close().catch(console.error))
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
if (process.connected) process.once('disconnect', stop)

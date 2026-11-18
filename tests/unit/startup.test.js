const net = require('node:net')
const { once } = require('node:events')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

test('an occupied server port reports a clear error and closes its database clients', async () => {
  const occupied = net.createServer()
  occupied.listen(0, '127.0.0.1')
  await once(occupied, 'listening')
  try {
    const env = {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(occupied.address().port),
      MYSQL_URL: 'mysql://root@127.0.0.1/alumni',
      MONGO_URL: 'mongodb://127.0.0.1',
      MONGO_DB: 'alumni',
    }
    await expect(
      promisify(execFile)(
        process.execPath,
        [require.resolve('../../server/start')],
        { env, windowsHide: true, timeout: 10000 },
      ),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('EADDRINUSE'),
    })
  } finally {
    await new Promise((resolve) => occupied.close(resolve))
  }
})

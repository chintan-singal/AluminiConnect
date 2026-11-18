const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const output = path.resolve(process.env.TEST_OUTPUT_DIR || path.join(root, 'output/test-results', day))
fs.mkdirSync(output, { recursive: true })
const manifestPath = path.join(output, 'runs.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : {
  startedAt: new Date().toISOString(), environment: {
    node: process.version, platform: os.platform(), release: os.release(),
    cpu: os.cpus()[0].model, logicalCpus: os.cpus().length,
    totalMemoryGiB: Math.round(os.totalmem() / 1073741824),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }, runs: [],
}
async function execute(label, args) {
  const prefix = String(manifest.runs.length + 1).padStart(2, '0') + '-' + label
  const logFile = prefix + '.log'
  const log = fs.createWriteStream(path.join(output, logFile))
  const started = Date.now()
  const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, env: { ...process.env, TEST_OUTPUT_DIR: output, TEST_RUN_PREFIX: prefix } })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => {
    log.write(chunk)
    process.stdout.write(chunk)
  })
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', resolve)
  })
  await new Promise((resolve) => log.end(resolve))
  manifest.runs.push({ label, prefix, command: 'node ' + args.join(' '),
    startedAt: new Date(started).toISOString(), durationMs: Date.now() - started,
    exitCode: code, logFile,
  })
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  if (code !== 0) process.exitCode = 1
}
async function main() {
  const phase = process.argv[2] || 'all'
  const selected = (name) => phase === 'all' || phase === name
  if (selected('build')) {
    await execute('typecheck', ['node_modules/typescript/bin/tsc', '-p', 'web', '--noEmit'])
    await execute('build', ['node_modules/vite/bin/vite.js', 'build', '--config', 'web/vite.config.mjs'])
  }
  if (selected('jest')) {
    const prefix = String(manifest.runs.length + 1).padStart(2, '0') + '-jest'
    await execute('jest', ['--env-file-if-exists=.env.test', 'node_modules/jest/bin/jest.js', '--runInBand', '--coverage', '--json',
      '--outputFile=' + path.join(output, prefix + '.json'), '--coverageDirectory=' + path.join(output, prefix + '-coverage'),
      '--coverageReporters=text', '--coverageReporters=json-summary', '--coverageReporters=html', '--coverageReporters=lcov'])
  }
  if (selected('browser')) await execute('browser', ['--env-file-if-exists=.env.test', '--test', '--test-concurrency=1', '--test-reporter=tap',
    'tests/browser/portal.test.cjs', 'tests/browser/demo.test.cjs', 'tests/browser/workflows.test.cjs'])
  if (selected('ui')) await execute('ui', ['--test', '--test-reporter=tap', 'tests/browser/layout.test.cjs'])
  if (selected('load')) await execute('load', ['--env-file-if-exists=.env.test', 'scripts/load.js'])
  console.log('Evidence saved to', output)
}
main().catch((error) => { console.error(error); process.exitCode = 1 })

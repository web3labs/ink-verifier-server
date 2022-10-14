import path from 'node:path'
import fs from 'node:fs'
import { FastifyInstance } from 'fastify'

import { BASE_DIR } from './config'
import workContext from './work/context'

function onReady (server: FastifyInstance) {
  server.log.info('Server ready')
  server.log.info('Cleaning up staging directories...')

  const dirs = [
    path.resolve(BASE_DIR, 'staging'),
    path.resolve(BASE_DIR, 'processing')
  ]

  dirs.forEach(dir => {
    server.log.info(`- Removing ${dir}`)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const EXIT_SIGNALS = [
    'SIGINT',
    'SIGTERM'
  ]
  EXIT_SIGNALS.forEach(eventName => {
    process.on(eventName, workContext.onExit.bind(workContext))
  })
}

export default onReady

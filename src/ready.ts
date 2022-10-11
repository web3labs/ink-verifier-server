import path from 'node:path'
import fs from 'node:fs'

import { BASE_DIR } from './config'
import { FastifyInstance } from 'fastify'

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
}

export default onReady

import path from 'node:path'
import fs from 'node:fs'
import { exec } from 'node:child_process'

import { BASE_DIR, DOCKER_ROOTLESS } from './config'
import { FastifyInstance } from 'fastify'

async function rootless (server: FastifyInstance) {
  // TODO: consider if this belongs here or better to move it out
  exec('docker context use rootless', (error, stdout) => {
    if (error) {
      throw error
    }
    server.log.info('Docker rootless context')
  })
}

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

  if (DOCKER_ROOTLESS) {
    rootless(server)
  }
}

export default onReady

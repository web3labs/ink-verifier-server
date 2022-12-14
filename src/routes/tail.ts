import fs from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { FastifyPluginCallback } from 'fastify'

import { VerifierLocations } from '../verification/locations'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import log from '../log'

enum MessageType {
  LOG = 'LOG',
  EOT = 'EOT'
}

const Tail : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get<{
      Params: NetworkCodeParams
    }>('/tail/:network/:codeHash', {
      websocket: true,
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 minute'
        }
      },
      schema: {
        hide: true,
        description: 'Tail processing log.',
        params: NetworkCodePathSchema
      }
    }, (conn, req) => {
      const {
        processingDir,
        publishDir
      } = new VerifierLocations(req.params)
      const logPath = path.resolve(processingDir, 'out.log')

      if (fs.existsSync(logPath)) {
        const tail = spawn('tail', ['-n', '+1', '-f', logPath])

        log.info(`[Tail] Start ${logPath} (${tail.pid})`)

        tail.stdout.on('data', data => {
          conn.socket.send(JSON.stringify({
            type: MessageType.LOG,
            data: data.toString('utf-8')
          }))
        })

        fs.watchFile(logPath, { interval: 1000 }, (curr) => {
          // The file is moved
          if (curr.ctimeMs === 0 &&
                curr.atimeMs === 0 &&
                curr.mtimeMs === 0) {
            fs.unwatchFile(logPath)
            tail.kill()

            const success = fs.existsSync(publishDir)

            conn.socket.send(JSON.stringify({
              type: MessageType.EOT,
              data: success
            }))

            conn.socket.close(1000)
          }
        })
        conn.socket.on('close', () => {
          log.info(`[Tail] End ${logPath} (${tail.pid})`)

          fs.unwatchFile(logPath)
          tail.kill()
        })
      } else {
        conn.socket.close(1013, 'Log not found')
      }
    })

  done()
}

export default Tail

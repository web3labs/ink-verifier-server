import fs from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { FastifyPluginCallback } from 'fastify'

import { VerifierLocations } from '../work/locations'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'

enum MessageType {
  LOG,
  EOT
}

const Tail : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get<{
      Params: NetworkCodeParams
    }>('/tail/:network/:codeHash', {
      websocket: true,
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

        tail.stdout.on('data', data => {
          conn.socket.send({
            type: MessageType.LOG,
            data: data.toString('utf-8')
          })
        })

        fs.watchFile(logPath, { interval: 1000 }, (curr) => {
          // The file is moved
          if (curr.ctimeMs === 0 &&
                curr.atimeMs === 0 &&
                curr.mtimeMs === 0) {
            fs.unwatchFile(logPath)
            tail.kill()

            const success = fs.existsSync(publishDir)

            conn.socket.send({
              type: MessageType.EOT,
              // 0 -> OK
              // 1 -> KO
              data: Number(success)
            })

            conn.socket.close(1000)
          }
        })
        conn.on('close', () => {
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

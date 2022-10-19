import * as fs from 'fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { FastifyPluginCallback } from 'fastify'

import { VerifierLocations } from '../work/locations'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'

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
        processingDir
      } = new VerifierLocations(req.params)
      const logPath = path.resolve(processingDir, 'out.log')

      if (fs.existsSync(logPath)) {
        const tail = spawn('tail', ['-n', '+1', '-f', logPath])
        tail.stdout.on('data', data => {
          conn.socket.send(data.toString('utf-8'))
        })
        fs.watchFile(logPath, { interval: 1000 }, (curr, prev) => {
          // The file is moved
          if (curr.ctimeMs === 0 &&
                curr.atimeMs === 0 &&
                curr.mtimeMs === 0) {
            fs.unwatchFile(logPath)
            tail.kill()

            conn.socket.send('⌁ END VERIFY')
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

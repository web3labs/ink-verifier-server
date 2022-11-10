
import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { VerifierLocations } from '../../verification/locations'

export default function registerErrorLogs (fastify: FastifyInstance) {
  fastify.get<{
    Params: {
      network: string,
      codeHash: string
    }
  }>('/contracts/:network/:codeHash/error.log', {
    schema: {
      description: 'Fetch error logs for a failed contract verification.',
      params: {
        network: {
          type: 'string'
        },
        codeHash: {
          type: 'string'
        }
      },
      response: {
        '4xx': {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const {
      errorDir
    } = new VerifierLocations({
      codeHash: req.params.codeHash,
      network: req.params.network
    })
    const logFile = path.resolve(errorDir, 'out.log')
    if (fs.existsSync(logFile)) {
      try {
        const { size, mtime } = fs.statSync(logFile)
        const stream = fs.createReadStream(logFile)
        return reply
          .type('text/plain')
          .header('content-length', size)
          .header('x-log-size', size)
          .header('x-log-mtime', mtime.toISOString())
          .send(stream)
      } catch (error) {
        throw HttpError.from(error, 400)
      }
    } else {
      return reply.code(404).send({
        code: '404',
        message: 'Log not found'
      })
    }
  })
}

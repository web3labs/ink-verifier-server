import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { VerifierLocations } from '../../verification/locations'
import { NetworkCodeParams, NetworkCodePathSchema } from '../common'

export default function registerErrorLogs (fastify: FastifyInstance) {
  fastify.get<{
    Params: NetworkCodeParams
  }>('/contracts/:network/:codeHash/error.log', {
    schema: {
      description: 'Fetch error logs for a failed contract verification.',
      params: NetworkCodePathSchema,
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
    } = new VerifierLocations(req.params)

    const logFile = path.resolve(errorDir, 'out.log')

    if (fs.existsSync(logFile)) {
      try {
        const { size, mtime } = fs.statSync(logFile)
        const stream = fs.createReadStream(logFile)
        const ts = Math.floor(mtime.getTime() / 1000)
        const filename = `error-${ts}_${req.params.network}_${req.params.codeHash}.log`
        return reply
          .type('text/plain')
          .header('content-length', size)
          .header('content-disposition', `attachment; filename="${filename}"`)
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

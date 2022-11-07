
import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { VerifierLocations } from '../../work/locations'

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

    try {
      const stream = fs.createReadStream(path.resolve(errorDir, 'out.log'))
      return reply.type('application/octet-stream').send(stream)
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })
}

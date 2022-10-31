
import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { VerifierLocations } from '../../work/locations'

export default function registerDownloadFile (fastify: FastifyInstance) {
  fastify.get<{
    Params: {
      codeHash: string,
      '*': string
    }
  }>('/contracts/:codeHash/src/*', {
    schema: {
      description: 'Lists source files of a verified contract.',
      params: {
        '*': {
          type: 'string',
          pattern: '((\\.)+)'
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
      publishDir
    } = new VerifierLocations({
      codeHash: req.params.codeHash,
      network: '*'
    })

    try {
      const stream = fs.createReadStream(path.resolve(publishDir, 'src', req.params['*']))
      return reply.type('application/octet-stream').send(stream)
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })
}

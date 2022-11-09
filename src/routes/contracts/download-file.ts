
import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { VerifierLocations } from '../../verification/locations'

export default function registerDownloadFile (fastify: FastifyInstance) {
  fastify.get<{
    Params: {
      codeHash: string,
      '*': string
    }
  }>('/contracts/:codeHash/src/*', {
    schema: {
      description: 'Fetch source files of a verified contract.',
      params: {
        '*': {
          type: 'string',
          pattern: '^(([0-9a-zA-Z_\\-. /])+)$'
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
    const filePath = req.params['*']
    const safeFilePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')

    try {
      const dst = path.join(publishDir, 'src', safeFilePath)
      if (fs.existsSync(dst)) {
        const stream = fs.createReadStream(dst)
        return reply.type('application/octet-stream').send(stream)
      } else {
        reply.code(404).send({
          code: '404',
          message: 'File not found'
        })
      }
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })
}

import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import { CodeHashParams, CodeHashPathSchema } from '../common'
import { VerifierLocations } from '../../work/locations'

export default function registerMetadata (fastify: FastifyInstance) {
  fastify.get<{
    Params: CodeHashParams
  }>('/contracts/:codeHash/metadata.json', {
    schema: {
      description: 'Fetch metadata of a verified contract.',
      params: CodeHashPathSchema,
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
      ...req.params,
      network: '*'
    })
    const metadataFile = path.resolve(publishDir, 'metadata.json')

    if (fs.existsSync(metadataFile)) {
      const data = fs.createReadStream(metadataFile)
      return reply.type('application/json').send(data)
    } else {
      reply.code(404).send({
        code: '404',
        message: 'Metadata not found'
      })
    }
  })
}

import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
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
        200: {
          type: 'object',
          additionalProperties: true
        },
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

    try {
      const found = fs.readdirSync(publishDir)
        .find(fn => fn.endsWith('.contract'))
      if (found) {
        const data = fs.readFileSync(path.resolve(publishDir, found))
        const meta = JSON.parse(data.toString())
        // filter out wasm
        delete meta.source?.wasm
        return reply.send(meta)
      } else {
        reply.code(404).send({
          code: '404',
          message: 'Metadata not found'
        })
      }
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })
}

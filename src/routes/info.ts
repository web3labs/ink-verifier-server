import { FastifyPluginCallback } from 'fastify'
import fs from 'node:fs'
import HttpError from '../errors'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import { VerifierLocations } from '../work/locations'

enum Status {
  'unknown' = 'unknown',
  'verified' = 'verified',
  'processing' = 'processing',
  'staging' = 'staging',
  'error' = 'error',
}

/**
 * Endpoint to get status information on the verification process.
 *
 * @param fastify The fatify instance
 * @param opts The fastify plug-in options
 * @param done The done callback
 */
const Info : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get<{
    Params: NetworkCodeParams
  }>('/info/:network/:codeHash', {
    schema: {
      description: 'Get information on verification status of an uploaded source code.',
      params: NetworkCodePathSchema,
      response: {
        200: {
          status: {
            enum: Object.keys(Status)
          }
        },
        '4xx': {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const {
      publishDir,
      processingDir,
      stagingDir,
      errorDir
    } = new VerifierLocations(req.params)

    try {
      let status : Status = Status.unknown
      if (fs.existsSync(publishDir)) {
        status = Status.verified
      } else if (fs.existsSync(processingDir)) {
        status = Status.processing
      } else if (fs.existsSync(stagingDir)) {
        status = Status.staging
      } else if (fs.existsSync(errorDir)) {
        status = Status.error
      } else {
        status = Status.unknown
      }

      reply.status(200).send({
        status
      })
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })

  done()
}

export default Info

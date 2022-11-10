import { FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import { VerificationStatus, VerifierLocations } from '../verification/locations'

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
          type: 'object',
          properties: {
            status: {
              enum: Object.keys(VerificationStatus)
            },
            timestamp: { type: 'string' }
          }
        },
        '4xx': {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const locs = new VerifierLocations(req.params)
    try {
      return reply.status(200).send(locs.verificationInfo)
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })

  done()
}

export default Info

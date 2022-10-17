import { FastifyPluginCallback } from 'fastify'
import * as fs from 'fs'
import HttpError from '../errors'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import { VerifierLocations } from '../work/locations'

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
          status: { type: 'string' }
        },
        '4xx': {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const {
      network,
      codeHash,
      publishDir,
      processingDir,
      stagingDir,
      errorDir
    } = new VerifierLocations(req.params)

    try {
      let status = ''
      if (fs.existsSync(publishDir)) {
        status = 'verified'
      } else if (fs.existsSync(processingDir)) {
        status = 'processing'
      } else if (fs.existsSync(stagingDir)) {
        status = 'staging'
      } else if (fs.existsSync(errorDir)) {
        status = 'error'
      } else {
        throw new HttpError(`Contract [${codeHash}] in network [${network}] not found`, 404)
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

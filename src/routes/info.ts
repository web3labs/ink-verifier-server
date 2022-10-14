import { FastifyPluginCallback } from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import { BASE_DIR, PUBLISH_DIR } from '../config'
import HttpError from '../errors'

interface InfoParams {
  network: string
  codeHash: string
}

/**
 * Endpoint to handle source package uploads for
 * a network and code hash.
 *
 * Rococo canvas example:
 * ```
 * curl --location --request POST 'http://127.0.0.1:3000/upload/rococoContracts/0x5160...e1f95' \
 *      --form 'package=@"./package.zip"'
 * ```
 *
 * @param fastify The fatify instance
 * @param opts The fastify plug-in options
 * @param done The done callback
 */
const Info : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get<{
    Params: InfoParams
  }>('/info/:network/:codeHash', {
    schema: {
      description: 'Get verification info',
      params: {
        type: 'object',
        properties: {
          network: {
            type: 'string',
            description: `The network name to resolve the node endpoint by
            [@polkadot/apps-config](https://github.com/polkadot-js/apps/tree/master/packages/apps-config/src/endpoints).
            `,
            default: 'rococoContracts'
          },
          codeHash: {
            type: 'string',
            description: 'The on-chain code hash for the contract source code'
          }
        }
      },
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
    const { network, codeHash } = req.params
    const stagingDir = path.resolve(BASE_DIR, 'staging', network, codeHash)
    const processingDir = path.resolve(BASE_DIR, 'processing', network, codeHash)
    const errorDir = path.resolve(BASE_DIR, 'error', network, codeHash)
    const publishDir = path.resolve(PUBLISH_DIR, network, codeHash)

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

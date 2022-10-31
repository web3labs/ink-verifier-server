import { FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import WorkMan from '../work/worker'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import { VerifierLocations } from '../work/locations'

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
const Upload : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.post<{
    Params: NetworkCodeParams
  }>('/upload/:network/:codeHash', {
    schema: {
      description: 'Upload source code package',
      consumes: ['multipart/form-data'],
      params: NetworkCodePathSchema,
      response: {
        201: {
          location: { type: 'string' }
        },
        '4xx': {
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
      // NOTE: There is no way to consume streams and validate the body
    }
  }, async (req, reply) => {
    const data = await req.file()

    if (data === undefined) {
      throw new HttpError('Please, specify compressed archive as file field', 400)
    }

    const locations = new VerifierLocations(req.params)

    const wm = new WorkMan({ locations })

    await wm.checkForStaging()

    const { file } = data

    try {
      wm.prepareStaging()

      await wm.writeToStaging(file)

      if (file.truncated) {
        wm.cleanStaging()
        return reply.send(new fastify.multipartErrors.FilesLimitError())
      } else {
        await wm.writePristine()

        // Roger, everything right to start processing
        await wm.startProcessing()

        return reply.status(201).send({
          location: `/info/${locations.codeHashPath}`
        })
      }
    } catch (error) {
      file.resume()
      wm.cleanStaging()

      throw HttpError.from(error, 400)
    }
  })

  done()
}

export default Upload

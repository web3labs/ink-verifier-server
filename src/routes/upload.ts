import { FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import WorkMan from '../verification/worker'
import { NetworkCodeParams, NetworkCodePathSchema } from './common'
import { VerificationStatus, VerifierLocations } from '../verification/locations'
import { verifyMetadata } from '../verification/metadata'

const ALLOWED_STATUS_TO_UPLOAD_METADATA = [
  VerificationStatus.unverified,
  VerificationStatus.metadata // allow overrides
]
/**
 * Endpoint to handle artifact uploads for
 * a network and code hash.
 *
 *
 * @param fastify The fatify instance
 * @param opts The fastify plug-in options
 * @param done The done callback
 */
const Upload : FastifyPluginCallback = (fastify, opts, done) => {
  /**
   * Handles uploading signed `metadata.json`.
   */
  fastify.post<{
    Params: NetworkCodeParams
  }>('/upload/:network/:codeHash', {
    schema: {
      description: 'Uploads signed metadata file for a code hash',
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
      // see `src/server/open-api.ts`
    }
  }, async (req, reply) => {
    const data = await req.file()
    if (data === undefined) {
      throw new HttpError('Please, upload metadata.json as metadata field', 400)
    }

    const signatureField = data?.fields?.signature as unknown as any
    if (signatureField === undefined) {
      throw new HttpError('Please, add a signature for a "message = sha256(metadata.json) | code hash" of the metadata.json', 400)
    }
    const signature : string = signatureField.value.startsWith('0x') ? signatureField.value : `0x${signatureField.value}`

    const locs = new VerifierLocations(req.params)
    if (ALLOWED_STATUS_TO_UPLOAD_METADATA.indexOf(locs.verificationStatus) < 0) {
      throw new HttpError('The code hash cannot be updated', 400)
    }

    try {
      await verifyMetadata({
        data,
        signature,
        locs
      })
    } catch (error) {
      throw HttpError.from(error, 400)
    }

    return reply.send(200)
  })

  /**
   * Triggers the verification process for a source code package.
   *
   * Rococo canvas example:
   * ```
   * curl --location --request POST 'http://127.0.0.1:3000/verify/rococoContracts/0x5160[...]e1f95' \
   *      --form 'package=@"./package.zip"'
   * ```
   */
  fastify.post<{
    Params: NetworkCodeParams
  }>('/verify/:network/:codeHash', {
    schema: {
      description: 'Verifies a source code package',
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
      // see `src/server/open-api.ts`
    }
  }, async (req, reply) => {
    const data = await req.file()

    if (data === undefined) {
      throw new HttpError('Please, specify compressed archive as package field', 400)
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

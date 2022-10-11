import { MultipartFile } from '@fastify/multipart'
import { FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import WorkMan from '../work/worker'

interface UploadParams {
  network: string
  codeHash: string
}

interface UploadBody {
  package: MultipartFile
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
const Upload : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.post<{
    Params: UploadParams,
    Body: UploadBody
  }>('/upload/:network/:codeHash', {
    schema: {
      description: 'Upload source code package',
      consumes: ['multipart/form-data'],
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
      body: {
        type: 'object',
        properties: {
          package: {
            format: 'binary',
            isFileType: true,
            description: `The compressed archive expected by the
            [Verifier Image](https://github.com/web3labs/ink-verifier/blob/main/README.md)
            `
          }
        },
        required: ['package']
      }
    }
  }, async (req, reply) => {
    const data = req.body.package

    if (data === undefined) {
      throw new HttpError('Please, specify compressed archive as file field', 400)
    }

    const { network, codeHash } = req.params

    const wm = new WorkMan({
      network,
      codeHash,
      log: fastify.log
    })

    await wm.checkForStaging()

    const { file } = data

    try {
      wm.prepareStaging()

      await wm.writeToStaging(file)

      if (file.truncated) {
        wm.cleanStaging()
        reply.send(new fastify.multipartErrors.FilesLimitError())
      } else {
        await wm.writePristine()

        // Roger, everything right to start processing
        await wm.startProcessing()

        reply.send(200)
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

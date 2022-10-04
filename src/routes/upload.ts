import { FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import WorkMan from '../work/worker'

interface UploadParams {
  network: string
  codeHash: string
}

/**
 * Endpoint to handle source package uploads for
 * a network and code hash.
 *
 * Rococo canvas example:
 * ```
 * curl --location --request POST 'http://127.0.0.1:3000/upload/rococoContracts/0x51606b677cc203a561cd0cfbba708024feb85f46fe42238afc55a115785e1f95' \
 *      --form 'file=@"./package.zip"'
 * ```
 *
 * @param fastify The fatify instance
 * @param opts The fastify plug-in options
 * @param done The done callback
 */
const Upload : FastifyPluginCallback = (fastify, opts, done) => {
  fastify.post<{
    Params: UploadParams
  }>('/upload/:network/:codeHash', async (req, reply) => {
    const data = await req.file()

    if (data === undefined) {
      throw new HttpError('Please, specify compressed archive as file field', 400)
    }

    const { network, codeHash } = req.params

    const wm = new WorkMan({
      network,
      codeHash,
      log: fastify.log
    })

    await wm.check()

    const { file } = data

    try {
      await wm.writePristine()
      await wm.pump(file)

      if (file.truncated) {
        wm.clean()
        reply.send(new fastify.multipartErrors.FilesLimitError())
      }

      reply.send(200)
    } catch (error) {
      file.resume()

      throw HttpError.from(error, 400)
    }
  })

  done()
}

export default Upload

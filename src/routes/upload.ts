import { FastifyPluginCallback } from 'fastify'
import HttpError from '../errors'

import WorkMan from '../work'

interface UploadParams {
  network: string
  codeHash: string
}

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

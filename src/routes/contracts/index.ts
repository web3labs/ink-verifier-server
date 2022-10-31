import { FastifyPluginCallback } from 'fastify'

import registerSourcesList from './sources-list'
import registerMetadata from './metadata'
import registerDownloadFile from './download-file'

const Contracts : FastifyPluginCallback = (fastify, opts, done) => {
  registerMetadata(fastify)
  registerSourcesList(fastify)
  registerDownloadFile(fastify)

  done()
}

export default Contracts

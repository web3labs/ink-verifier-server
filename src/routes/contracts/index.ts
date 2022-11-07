import { FastifyPluginCallback } from 'fastify'

import registerSourcesList from './sources-list'
import registerMetadata from './metadata'
import registerDownloadFile from './download-file'
import registerErrorLogs from './error-logs'

const Contracts : FastifyPluginCallback = (fastify, opts, done) => {
  registerMetadata(fastify)
  registerSourcesList(fastify)
  registerDownloadFile(fastify)
  registerErrorLogs(fastify)

  done()
}

export default Contracts

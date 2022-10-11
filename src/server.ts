import Fastify, { FastifyInstance } from 'fastify'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'

import { Upload } from './routes'
import { SERVER_HOST, SERVER_PORT } from './config'

const server: FastifyInstance = Fastify({
  logger: true
})

server.register(UnderPressure, {
  maxEventLoopDelay: 1000,
  retryAfter: 50,
  exposeStatusRoute: true
})

server.register(Multipart, {
  limits: {
    fields: 0, // Max number of non-file fields
    fileSize: 1e+7, // For multipart forms, the max file size in bytes
    files: 1, // Max number of file fields
    headerPairs: 200 // Max number of header key=>value pairs
  }
})

server.register(Upload)

// TODO impl
// Restart logic (log any of the rm's if any)
// 1) clean up staging/
// 2) clean up processing/

const start = async () => {
  try {
    await server.listen({ 
      port: SERVER_PORT,
      host: SERVER_HOST
    })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()

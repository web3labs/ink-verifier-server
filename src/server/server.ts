import Fastify, { FastifyServerOptions } from 'fastify'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'
import WebSocket from '@fastify/websocket'
import cors from '@fastify/cors'

import { Upload, Info, Tail } from '../routes'
import registerOpenApi from './open-api'

function Server (config: FastifyServerOptions) {
  const server = Fastify(config)

  // TODO: Configure CORS here
  server.register(cors, {
    origin: true
  })

  server.register(WebSocket, {
    options: {
      maxPayload: 1048576
    }
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

  registerOpenApi(server)

  server.register(Upload)
  server.register(Info)
  server.register(Tail)

  return server
}

export default Server

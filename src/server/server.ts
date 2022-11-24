import Fastify, { FastifyServerOptions } from 'fastify'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'
import WebSocket from '@fastify/websocket'
import CORS from '@fastify/cors'
import RateLimit from '@fastify/rate-limit'

import { Upload, Info, Tail, Contracts } from '../routes'
import registerOpenApi from './open-api'

function Server (config: FastifyServerOptions) {
  const server = Fastify(config)

  server.register(RateLimit, {
    global: false
  })

  server.register(CORS, {
    origin: true // Allow any origin
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
      fields: 1, // Max number of non-file fields
      fileSize: 1e+7, // For multipart forms, the max file size in bytes
      files: 1, // Max number of file fields
      headerPairs: 50 // Max number of header key=>value pairs
    }
  })

  registerOpenApi(server)

  server.register(Contracts)
  server.register(Upload)
  server.register(Info)
  server.register(Tail)

  return server
}

export default Server

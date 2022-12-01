import Fastify, { FastifyServerOptions } from 'fastify'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'
import WebSocket from '@fastify/websocket'
import CORS from '@fastify/cors'
import RateLimit from '@fastify/rate-limit'

import { ApiDocs, Upload, Info, Tail, Contracts } from '../routes'
import registerOpenApi from './open-api'

interface ServicesConfig {
    underPressure: boolean,
    rateLimit: boolean,
    cors: boolean,
    swaggerUI: boolean
}

export const TestServicesConfig : ServicesConfig = {
  underPressure: false,
  rateLimit: false,
  cors: false,
  swaggerUI: false
}

async function Server (config: FastifyServerOptions & {
  services: ServicesConfig
}) {
  const server = await Fastify(config)

  /* istanbul ignore next */
  if (config.services.cors) {
    await server.register(CORS, {
      origin: true // Allow any origin
    })
  }

  /* istanbul ignore next */
  if (config.services.rateLimit) {
    await server.register(RateLimit, {
      global: false
    })
  }

  await server.register(WebSocket, {
    options: {
      maxPayload: 1048576
    }
  })

  /* istanbul ignore next */
  if (config.services.underPressure) {
    await server.register(UnderPressure, {
      maxEventLoopDelay: 1000,
      retryAfter: 50,
      exposeStatusRoute: true
    })
  }

  await server.register(Multipart, {
    limits: {
      fields: 1, // Max number of non-file fields
      fileSize: 1e+7, // For multipart forms, the max file size in bytes
      files: 1, // Max number of file fields
      headerPairs: 50 // Max number of header key=>value pairs
    }
  })

  /* istanbul ignore next */
  if (config.services.swaggerUI) {
    await server.register(ApiDocs)
  }
  await registerOpenApi(server)

  await server.register(Contracts)
  await server.register(Upload)
  await server.register(Info)
  await server.register(Tail)

  return server
}

export default Server

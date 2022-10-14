import Fastify from 'fastify'
import Swagger, { JSONObject } from '@fastify/swagger'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'

import { Upload } from './routes'
import { OAS_URL, SERVER_HOST, SERVER_PORT } from './config'
import onReady from './ready'

const server = Fastify({
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

server.register(Swagger, {
  openapi: {
    info: {
      title: 'Ink Verification Service API',
      description: 'The ink! verification service api',
      version: '0.0.1'
    },
    servers: [{
      url: OAS_URL
    }]
  },
  transform: ({ schema, url }) => {
    // Workaround for proper multi-part OpenAPI docs
    if (url.startsWith('/upload')) {
      const {
        body,
        ...transformed
      } = schema
      const json = transformed as unknown as JSONObject
      json.body = {
        type: 'object',
        properties: {
          package: {
            format: 'binary',
            type: 'file',
            description: `The compressed archive expected by the
            [Verifier Image](https://github.com/web3labs/ink-verifier/blob/main/README.md)
            `
          }
        },
        required: ['package']
      }
      return { schema: json, url }
    } else {
      return { schema: schema as unknown as JSONObject, url }
    }
  }
})

server.get('/oas.json', {
  schema: { hide: true },
  handler: function (req, reply) {
    reply.send(server.swagger())
  }
})

server.register(Upload)

server.ready(err => {
  if (err) {
    server.log.error(err)
    throw err
  }
  onReady(server)
})

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

import Fastify, { FastifyInstance } from 'fastify'
import ajv from 'ajv'
import Swagger from '@fastify/swagger'
import UnderPressure from '@fastify/under-pressure'
import Multipart from '@fastify/multipart'

import { Upload } from './routes'
import { SERVER_HOST, SERVER_PORT } from './config'

function ajvPlugin (ajv : ajv.Ajv) {
  ajv.addKeyword('isFileType', {
    compile: (schema, parent : {type?: string, isFileType?: boolean}, it) => {
      // Change the schema type, as this is post validation it doesn't appear to error.
      parent.type = 'file'
      delete parent.isFileType
      return () => true
    }
  })
  return ajv
}

const server: FastifyInstance = Fastify({
  logger: true,
  ajv: { plugins: [ajvPlugin] }
})

server.register(UnderPressure, {
  maxEventLoopDelay: 1000,
  retryAfter: 50,
  exposeStatusRoute: true
})

server.register(Multipart, {
  attachFieldsToBody: true,
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
      url: 'http://127.0.0.1:3000'
    }]
  }
})

server.get('/oas.json', {
  schema: { hide: true },
  handler: function (req, reply) {
    reply.send(server.swagger())
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

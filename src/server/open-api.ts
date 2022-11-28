import Swagger, { JSONObject } from '@fastify/swagger'
import { FastifyInstance, FastifySchema } from 'fastify'
import { OAS_URL } from '../config'

export function transformSchema ({
  schema,
  url
}: {
  schema: FastifySchema,
  url: string
}) {
  if (url.startsWith('/verify')) {
    const {
      // we remove body from the schema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  } else if (url.startsWith('/upload')) {
    const {
      // we remove body from the schema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      body,
      ...transformed
    } = schema
    const json = transformed as unknown as JSONObject
    json.body = {
      type: 'object',
      properties: {
        metadata: {
          format: 'binary',
          type: 'file',
          description: 'The metadata.json file'
        },
        signature: {
          type: 'string',
          description: 'The xxx signature, see tutto...'
        }
      },
      required: ['metadata', 'signature']
    }
    return { schema: json, url }
  } else {
    return { schema: schema as unknown as JSONObject, url }
  }
}

export default async function registerOpenApi (server: FastifyInstance) {
  await server.register(Swagger, {
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
    // Workaround for proper multi-part OpenAPI docs
    transform: transformSchema
  })

  await server.addSchema({
    $id: 'dirEntry',
    type: 'object',
    properties: {
      type: { type: 'string' },
      name: { type: 'string' },
      url: { type: 'string' },
      size: { type: 'number' },
      utf8: { type: 'boolean' },
      ents: {
        type: 'array',
        items: { $ref: 'dirEntry#' }
      }
    }
  })

  server.get('/oas.json', {
    schema: { hide: true },
    handler: function (req, reply) {
      return reply.send(server.swagger())
    }
  })
}

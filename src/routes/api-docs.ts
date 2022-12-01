/* istanbul ignore file */

import { FastifyPluginCallback } from 'fastify'
import resolveSwaggerUI from '../config/swagger-ui'
import Static from '@fastify/static'
import { OAS_URL } from '../config'

const ApiDocs : FastifyPluginCallback = async (fastify, opts, done) => {
  const uiPath = resolveSwaggerUI()

  await fastify.register(Static, {
    root: uiPath,
    prefix: '/api-docs'
  })

  fastify.get('/api-docs', async (_, reply) => {
    return reply.redirect(`${OAS_URL}/api-docs/`)
  })

  fastify.get('/api-docs/', async (_, reply) => {
    return reply.sendFile('index.html')
  })

  fastify.get('/api-docs/swagger-initializer.js', async (_, reply) => {
    reply.send(`
    window.onload = function() {
      //<editor-fold desc="Changeable Configuration Block">
    
      // the following lines will be replaced by docker/configurator, when it runs in a docker-container
      window.ui = SwaggerUIBundle({
        url: "${OAS_URL}/oas.json",
        validatorUrl: null,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    
      //</editor-fold>
    };    
    `)
  })

  fastify.get<{
    Params: {
      wildcard: string
  }}>('/api-docs/:wildcard', {
    schema: {
      hide: true,
      params: {
        wildcard: {
          type: 'string',
          pattern: '^(([0-9a-zA-Z_\\-. /])+)$'
        }
      }
    }
  }, async (req, reply) => {
    const path = req.params.wildcard
    return reply.sendFile(path)
  })

  done()
}

export default ApiDocs

import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance, FastifyPluginCallback } from 'fastify'

import HttpError from '../errors'
import { CodeHashParams, CodeHashPathSchema } from './common'
import { VerifierLocations } from '../work/locations'

function registerMetadata (fastify: FastifyInstance) {
  fastify.get<{
  Params: CodeHashParams
}>('/contracts/:codeHash/metadata.json', {
  schema: {
    description: 'Fetch metadata of a verified contract.',
    params: CodeHashPathSchema,
    response: {
      200: {
        type: 'object',
        additionalProperties: true
      },
      '4xx': {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}, async (req, reply) => {
  const {
    publishDir
  } = new VerifierLocations({
    ...req.params,
    network: '*'
  })

  try {
    const found = fs.readdirSync(publishDir)
      .find(fn => fn.endsWith('.contract'))
    if (found) {
      const data = fs.readFileSync(path.resolve(publishDir, found))
      const meta = JSON.parse(data.toString())
      // filter out wasm
      delete meta.source?.wasm
      return reply.send(meta)
    } else {
      reply.code(404).send({
        code: '404',
        message: 'Metadata not found'
      })
    }
  } catch (error) {
    throw HttpError.from(error, 400)
  }
})
}

interface DirStructEntry {
  type: string,
  url: string,
  size: number,
  ents?: DirStructEntry[]
}

function dirList (
  dirPath: string,
  baseDir?: string,
  structEnts: DirStructEntry[] = []
) {
  const entries = fs.readdirSync(dirPath, {
    withFileTypes: true
  })

  baseDir = baseDir || dirPath

  entries.forEach(ent => {
    const file = path.resolve(dirPath, ent.name)
    const url = path.posix.relative(baseDir!, file)
    const { size } = fs.statSync(file)
    if (ent.isDirectory()) {
      const ents = dirList(path.resolve(dirPath, ent.name), baseDir, [])
      structEnts.push({
        type: 'dir',
        url,
        size,
        ents
      })
    } else if (ent.isFile()) {
      structEnts.push({
        type: 'file',
        url,
        size
      })
    }
  })

  return structEnts
}

function registerSourcesList (fastify: FastifyInstance) {
  fastify.get<{
  Params: CodeHashParams
}>('/contracts/:codeHash/src', {
  schema: {
    description: 'Lists source files of a verified contract.',
    params: CodeHashPathSchema,
    response: {
      200: {
        definitions: {
          dirEntry: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              url: { type: 'string' },
              size: { type: 'number' },
              ents: {
                type: 'array',
                items: { $ref: '#/definitions/dirEntry' }
              }
            }
          }
        },
        type: 'array',
        items: { $ref: '#/definitions/dirEntry' }
      },
      '4xx': {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}, async (req, reply) => {
  const {
    publishDir
  } = new VerifierLocations({
    ...req.params,
    network: '*'
  })

  try {
    const entries = dirList(path.resolve(publishDir, 'src'))
    return reply.send(entries)
  } catch (error) {
    throw HttpError.from(error, 400)
  }
})
}

function registerDownloadFile (fastify: FastifyInstance) {
  fastify.get<{
  Params: {
    codeHash: string,
    '*': string
  }
}>('/contracts/:codeHash/src/*', {
  schema: {
    description: 'Lists source files of a verified contract.',
    params: {
      '*': {
        type: 'string',
        pattern: '((\\.)+)'
      },
      codeHash: {
        type: 'string'
      }
    },
    response: {
      '4xx': {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}, async (req, reply) => {
  const {
    publishDir
  } = new VerifierLocations({
    codeHash: req.params.codeHash,
    network: '*'
  })

  try {
    const stream = fs.createReadStream(path.resolve(publishDir, 'src', req.params['*']))
    return reply.type('application/octet-stream').send(stream)
  } catch (error) {
    throw HttpError.from(error, 400)
  }
})
}

const Contracts : FastifyPluginCallback = (fastify, opts, done) => {
  registerMetadata(fastify)
  registerSourcesList(fastify)
  registerDownloadFile(fastify)

  done()
}

export default Contracts

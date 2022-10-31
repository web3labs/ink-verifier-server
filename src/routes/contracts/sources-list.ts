import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { CodeHashParams, CodeHashPathSchema } from '../common'
import { VerifierLocations } from '../../work/locations'

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

export default function registerSourcesList (fastify: FastifyInstance) {
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

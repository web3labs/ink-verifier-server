import fs from 'node:fs'
import path from 'node:path'

import { FastifyInstance } from 'fastify'

import HttpError from '../../errors'
import { CodeHashParams, CodeHashPathSchema } from '../common'
import { VerifierLocations } from '../../work/locations'
import { isUtf8 } from '../../encoding/ut8'

const BYTES_NUM = 256 // enough to detect if UTF8

interface DirStructEntry {
  type: string,
  url: string,
  name: string,
  size: number,
  utf8?: boolean,
  ents?: DirStructEntry[]
}

async function readBytes (path: fs.PathLike, bytesNum: number): Promise<Buffer> {
  const chunks = []
  for await (const chunk of fs.createReadStream(
    path, { start: 0, end: bytesNum }
  )) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function dirList (
  dirPath: string,
  baseDir?: string,
  structEnts: DirStructEntry[] = []
) {
  const entries = fs.readdirSync(dirPath, {
    withFileTypes: true
  })

  baseDir = baseDir || dirPath

  for (let i = 0; i < entries.length; i++) {
    const ent = entries[i]
    const file = path.resolve(dirPath, ent.name)
    const url = path.posix.relative(baseDir!, file)
    if (ent.isDirectory()) {
      const ents = await dirList(path.resolve(dirPath, ent.name), baseDir, [])

      structEnts.push({
        type: 'dir',
        name: ent.name,
        url,
        size: 0,
        ents
      })
    } else if (ent.isFile()) {
      const { size } = fs.statSync(file)
      const buff = await readBytes(file, BYTES_NUM)
      const utf8 = isUtf8(buff, 0, buff.length)

      structEnts.push({
        type: 'file',
        name: ent.name,
        url,
        size,
        utf8
      })
    }
  }

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
                name: { type: 'string' },
                url: { type: 'string' },
                size: { type: 'number' },
                utf8: { type: 'boolean' },
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
      const entries = await dirList(path.resolve(publishDir, 'src'))

      return reply.send(entries)
    } catch (error) {
      throw HttpError.from(error, 400)
    }
  })
}

import { FastifyInstance } from 'fastify'
import fs, { Stats, ReadStream } from 'node:fs'
import { Readable } from 'node:stream'

import Server from '../../server/server'

jest.mock('node:fs', () => (
  {
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    statSync: jest.fn()
  }
))

describe('contract resources endpoints', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // run the server instance we are testing against
    server = await Server({
      services: {
        underPressure: false,
        rateLimit: false,
        cors: false
      }
    })
    await server.listen({ port: 0 })
  })

  afterAll(async () => {
    await server.close()
  })

  const existsSyncSpy = jest.spyOn(fs, 'existsSync')
  const statSyncSpy = jest.spyOn(fs, 'statSync')

  beforeEach(() => {
    existsSyncSpy.mockClear()
    statSyncSpy.mockClear()
  })

  describe('contracts endpoint', () => {
    it('should return 404 if metadata does not exist', async () => {
      existsSyncSpy.mockReturnValue(false)

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x1/metadata.json'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(404)
    })

    it('should return metadata stream if exists', async () => {
      existsSyncSpy.mockReturnValue(true)

      const createStreamSpy = jest.spyOn(fs, 'createReadStream')
      createStreamSpy.mockImplementation(() => (
        Readable.from(
          Buffer.from(`{
        'name': 'test'
      }`)) as ReadStream))

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x1/metadata.json'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
    })
  })

  describe('error log endpoint', () => {
    it('should return 404 if error log does not exist', async () => {
      existsSyncSpy.mockReturnValue(false)

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/rococoContracts/0x/error.log'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(404)
    })

    it('should stream error log if exists', async () => {
      existsSyncSpy.mockReturnValue(true)
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: new Date()
        }
      ))

      const createSteamSpy = jest.spyOn(fs, 'createReadStream')
      createSteamSpy.mockImplementation(() => (
        Readable.from(
          Buffer.from('Empty log')
        ) as ReadStream
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/rococoContracts/0x/error.log'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
    })

    it('should return 400 on read error', async () => {
      existsSyncSpy.mockReturnValue(true)

      const createSteamSpy = jest.spyOn(fs, 'createReadStream')
      createSteamSpy.mockImplementation(() => {
        throw new Error('oops')
      })

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/rococoContracts/0x/error.log'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(400)
    })
  })

  describe('download file endpoint', () => {
    it('should return 404 if error file does not exist', async () => {
      existsSyncSpy.mockReturnValue(false)

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x/src/lib.rs'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(404)
    })

    it('should return file stream if exists', async () => {
      existsSyncSpy.mockReturnValue(true)

      const createSteamSpy = jest.spyOn(fs, 'createReadStream')
      createSteamSpy.mockImplementation(() => (
        Readable.from(
          Buffer.from('rust src')
        ) as ReadStream
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x/src/lib.rs'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
    })

    it('should return 400 on read error', async () => {
      existsSyncSpy.mockReturnValue(true)

      const createSteamSpy = jest.spyOn(fs, 'createReadStream')
      createSteamSpy.mockImplementation(() => {
        throw new Error('oops')
      })

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x/src/lib.rs'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(400)
    })
  })

  describe('sources listing endpoint', () => {
    const readdirSync = jest.spyOn(fs, 'readdirSync')

    beforeEach(() => {
      readdirSync.mockClear()
    })

    it('should return sources listing', async () => {
      readdirSync.mockReturnValue([])

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x/src'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
    })

    it('should return 400 on error', async () => {
      readdirSync.mockImplementation(() => {
        throw new Error('oops')
      })

      const response = await server.inject({
        method: 'GET',
        url: '/contracts/0x/src'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(400)
    })
  })
})

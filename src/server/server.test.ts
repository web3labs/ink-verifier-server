import { FastifyInstance } from 'fastify'
import fs, { Stats } from 'node:fs'

import Server, { TestServicesConfig } from './server'

jest.mock('node:fs', () => (
  {
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn()
  }
))

describe('server', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // run the server instance we are testing against
    server = await Server({
      services: TestServicesConfig
    })
    await server.listen({ port: 0 })
  })

  afterAll(async () => {
    await server.close()
  })

  describe('info endpoint', () => {
    const existsSyncSpy = jest.spyOn(fs, 'existsSync')
    const statSyncSpy = jest.spyOn(fs, 'statSync')

    beforeEach(() => {
      existsSyncSpy.mockClear()
      statSyncSpy.mockClear()
    })

    it('should return unknown for non-existent contract', async () => {
      existsSyncSpy.mockReturnValue(false)

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.json()).toEqual({
        status: 'unverified',
        timestamp: ''
      })
      existsSyncSpy.mockRestore()
    })

    it('should return verified status for verified contract', async () => {
      existsSyncSpy.mockReturnValueOnce(true)

      const now = new Date()
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: now
        }
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'verified',
        timestamp: now.toISOString()
      })
    })

    it('should return metadata status', async () => {
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(true)

      const now = new Date()
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: now
        }
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'metadata',
        timestamp: now.toISOString()
      })
    })

    it('should return processing status', async () => {
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(true)

      const now = new Date()
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: now
        }
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'processing',
        timestamp: now.toISOString()
      })
    })

    it('should return staging status', async () => {
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(true)

      const now = new Date()
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: now
        }
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'staging',
        timestamp: now.toISOString()
      })
    })

    it('should return error status', async () => {
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(false)
      existsSyncSpy.mockReturnValueOnce(true)

      const now = new Date()
      statSyncSpy.mockReturnValue(Object.assign(
        new Stats(),
        {
          mtime: now
        }
      ))

      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({
        status: 'error',
        timestamp: now.toISOString()
      })
    })
  })

  describe('documentation endpoint', () => {
    it('should serve Swagger docs', async () => {
      const mockSwagger = jest.spyOn(server, 'swagger').mockImplementation()
      const response = await server.inject({
        method: 'GET',
        url: '/oas.json'
      })
      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
      expect(mockSwagger).toBeCalled()
      mockSwagger.mockRestore()
    })
  })
})

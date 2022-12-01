import Fastify, { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import path from 'path'
import FormData from 'form-data'
import Multipart from '@fastify/multipart'

import Server, { TestServicesConfig } from '../server/server'
import WorkMan from '../verification/worker'
import { Upload } from '../routes'

import '@polkadot/util/cjs/versionDetect'

jest.mock('@polkadot/util/cjs/versionDetect')

jest.mock('../verification/worker')

jest.mock('node:fs', () => (
  {
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn()
  }
))

jest.mock('../verification/metadata')

describe('upload endpoints', () => {
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

  describe('verify endpoint', () => {
    const MockedWorkMan = jest.mocked(WorkMan)

    beforeEach(() => {
      // Clears the record of calls to the mock constructor function and its methods
      MockedWorkMan.mockRestore()
    })

    it('should return error if no file is uploaded', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/verify/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(406)
      expect(response.json()).toEqual({ code: 'FST_INVALID_MULTIPART_CONTENT_TYPE', message: 'the request is not multipart' })
    })

    it('should clean staging directory if processing is not started succesfully', async () => {
      MockedWorkMan.prototype.prepareStaging.mockImplementation(() => { throw new Error('Oops') })
      const mockCleanStaging = jest.spyOn(MockedWorkMan.prototype, 'cleanStaging')

      const form = new FormData()
      form.append('file', fs.createReadStream(
        path.resolve(__dirname, '../../__data__/mockZip.zip')
      ))
      const response = await server.inject({
        method: 'POST',
        url: '/verify/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(mockCleanStaging).toBeCalled()
      expect(response).toBeDefined()
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({ message: 'Oops' })
      MockedWorkMan.prototype.prepareStaging.mockRestore()
    })

    it('should return success if file is uploaded for verification', async () => {
      const form = new FormData()
      form.append('file', fs.createReadStream(
        path.resolve(__dirname, '../../__data__/mockZip.zip')
      ))
      const response = await server.inject({
        method: 'POST',
        url: '/verify/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(WorkMan).toBeCalled()
      expect(response).toBeDefined()
      expect(response.statusCode).toBe(201)
      expect(response.json()).toEqual({ location: '/info/rococoContracts/0x' })
    })

    it('should return error if file is truncated', async () => {
      const cleanStagingSpy = jest.spyOn(WorkMan.prototype, 'cleanStaging')

      // Need a new fastify instance to register multipart plugin with tiny file size limit
      const fastify = Fastify()
      fastify.register(Multipart, {
        limits: {
          fields: 0,
          fileSize: 1, // 1 byte file size limit to test truncated
          files: 1,
          headerPairs: 200
        }
      })
      fastify.register(Upload)

      await fastify.listen({ port: 0 })

      const form = new FormData()
      form.append('file', fs.createReadStream(
        path.resolve(__dirname, '../../__data__/mockZip.zip')
      ))
      const response = await fastify.inject({
        method: 'POST',
        url: '/verify/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(cleanStagingSpy).toBeCalled()
      expect(response).toBeDefined()
      expect(response.statusCode).toBe(413)
      expect(response.statusMessage).toBe('Payload Too Large')
      expect(response.json()).toEqual({ code: 'FST_FILES_LIMIT', message: 'reach files limit' })

      await fastify.close()
    })
  })

  describe('signed metadata upload endpoint', () => {
    it('should return error if no file is uploaded', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(406)
      expect(response.json()).toEqual({ code: 'FST_INVALID_MULTIPART_CONTENT_TYPE', message: 'the request is not multipart' })
    })

    it('should return error on missing signature', async () => {
      const form = new FormData()
      form.append('metadata', Readable.from(
        Buffer.from('some data')
      ))

      const response = await server.inject({
        method: 'POST',
        url: '/upload/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({
        message: 'Please, add a signature for a "message = sha256(metadata.json) | code hash" of the metadata.json'
      })
    })

    it('should verify signed metadata', async () => {
      const form = new FormData()
      form.append('metadata', Readable.from(
        Buffer.from('some data')
      ))
      form.append('signature', '0x00')

      const response = await server.inject({
        method: 'POST',
        url: '/upload/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(200)
    })
  })
})

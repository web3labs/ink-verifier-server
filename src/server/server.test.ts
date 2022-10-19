import { FastifyInstance } from 'fastify'
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'

import { SERVER_PORT, SERVER_HOST } from '../config'
import Server from './server'
import WorkMan from '../work/worker'

jest.mock('./work/worker')

describe('set up Fastify server', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // run the server instance we are testing against
    server = Server({})
    await server.listen({
      port: SERVER_PORT,
      host: SERVER_HOST
    })
  })

  afterAll(async () => {
    await server.close()
  })

  describe('info endpoint', () => {
    it('should return 404 for non-existent contract', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/info/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(404)
    })
  })

  describe('upload endpoint', () => {
    it('should return error if no file is uploaded', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/upload/rococoContracts/0x'
      })

      expect(response).toBeDefined()
      expect(response.statusCode).toBe(406)
      expect(response.json()).toEqual({ code: 'FST_INVALID_MULTIPART_CONTENT_TYPE', message: 'the request is not multipart' })
    })

    it('should return success if file is uploaded', async () => {
      const form = new FormData()
      form.append('file', fs.createReadStream(
        path.resolve(__dirname, '../__data__/mockArchive.zip')
      ))
      const response = await server.inject({
        method: 'POST',
        url: '/upload/rococoContracts/0x',
        payload: form,
        headers: form.getHeaders()
      })

      expect(WorkMan).toBeCalled()
      expect(response).toBeDefined()
      expect(response.statusCode).toBe(201)
      expect(response.json()).toEqual({ location: '/info/rococoContracts/0x' })
    })
  })
})

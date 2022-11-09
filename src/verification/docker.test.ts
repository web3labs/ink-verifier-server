import { ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs'
import Docker from './docker'
import workContext from './context'

const cp = new ChildProcess()

jest.mock('node:child_process', () => {
  const originalModule = jest.requireActual('node:child_process')

  return {
    __esModule: true,
    ...originalModule,
    spawn: jest.fn(() => {
      return cp
    })
  }
})
jest.mock('node:fs')

describe('docker', () => {
  let processingDir: string
  let successHandler: jest.Mock<any, any>
  let errorHandler: jest.Mock<any, any>

  beforeAll(() => {
    processingDir = ''
    successHandler = jest.fn()
    errorHandler = jest.fn()
  })

  describe('run', () => {
    let docker: Docker

    beforeAll(() => {
      docker = new Docker()
    })

    it('should call success handler when child process exits successfully', async () => {
      const addProc = jest.spyOn(workContext, 'addProc')
      const rmProc = jest.spyOn(workContext, 'rmProc')
      docker.run({ processingDir, errorHandler, successHandler })
      cp.emit('close', 0)
      expect(spawn).toBeCalled()
      expect(fs.openSync).toBeCalled()
      expect(workContext).toBeDefined()
      expect(addProc).toBeCalled()
      expect(rmProc).toBeCalled()
      expect(successHandler).toBeCalled()
    })

    it('should call error handler when child process exits on error', async () => {
      const addProc = jest.spyOn(workContext, 'addProc')
      const rmProc = jest.spyOn(workContext, 'rmProc')
      docker.run({ processingDir, errorHandler, successHandler })
      cp.emit('close', 1)
      expect(spawn).toBeCalled()
      expect(workContext).toBeDefined()
      expect(addProc).toBeCalled()
      expect(rmProc).toBeCalled()
      expect(errorHandler).toBeCalled()
    })
  })

  describe('canRunMore', () => {
    let docker: Docker

    beforeAll(() => {
      docker = new Docker()
    })

    it('should return true on start', async () => {
      expect(await docker.canRunMore()).toBe(true)
    })
  })
})

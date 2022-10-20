import fs from 'node:fs'
import * as path from 'path'
import WorkMan from './worker'
import { BASE_DIR, PUBLISH_DIR } from '../config'
import { VerifierLocations } from './locations'

jest.mock('node:fs', () => (
  {
    existsSync: jest.fn()
  }
))

describe('worker', () => {
  // const MockedWorkMan = jest.mocked(WorkMan)
  const network = 'test'
  const codeHash = '0xTest'
  const workManInstance = new WorkMan({ locations: new VerifierLocations({ network, codeHash }) })

  // beforeEach(() => {
  //   // Clears the record of calls to the mock constructor function and its methods
  //   MockedWorkManInstance.mockRestore()
  // })
  describe('checkForStaging', () => {
    const mockExistsSync = jest.spyOn(fs, 'existsSync')
    const mockDockerCanRunMore = jest.spyOn(workManInstance.docker, 'canRunMore')

    it('should throw if contract is in publish directory', async () => {
      mockExistsSync.mockReturnValueOnce(true)

      await expect(workManInstance.checkForStaging()).rejects.toThrow(`${network}/${codeHash} is already verified.`)
    })

    it('should throw if contract is in staging directory', async () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(true)

      await expect(workManInstance.checkForStaging()).rejects.toThrow(`Workload for ${network}/${codeHash} is staged for processing.`)
    })

    it('should throw if contract is in processing directory', async () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)

      await expect(workManInstance.checkForStaging()).rejects.toThrow(`Workload for ${network}/${codeHash} is in processing.`)
    })

    it('should throw if docker workload limit is exceeded', async () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false)
      mockDockerCanRunMore.mockReturnValueOnce(false)

      await expect(workManInstance.checkForStaging()).rejects.toThrow('Workload limit reached, please retry later')
    })

    it('should not throw any errors if contract is eligible for staging', async () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false)
      mockDockerCanRunMore.mockReturnValueOnce(true)

      await expect(workManInstance.checkForStaging()).resolves.not.toThrow()
    })
  })
})

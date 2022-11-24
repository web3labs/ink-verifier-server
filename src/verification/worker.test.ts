import fs, { PathLike } from 'node:fs'
import WorkMan, { resolveTypeInfo } from './worker'
import { VerifierLocations } from './locations'
import path from 'node:path'

jest.mock('node:fs', () => (
  {
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    renameSync: jest.fn(),
    mkdirSync: jest.fn(),
    rmSync: jest.fn()
  }
))

describe('worker', () => {
  const network = 'test'
  const codeHash = '0xTest'

  describe('work man', () => {
    const workManInstance = new WorkMan({ locations: new VerifierLocations({ network, codeHash }) })
    const existsSyncSpy = jest.spyOn(fs, 'existsSync')
    const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync')
    const renameSyncSpy = jest.spyOn(fs, 'renameSync')
    const rmSyncSpy = jest.spyOn(fs, 'rmSync')
    const locs = workManInstance.locations

    describe('checkForStaging', () => {
      const mockDockerCanRunMore = jest.spyOn(workManInstance.docker, 'canRunMore')

      it('should throw if contract is in publish directory', async () => {
        existsSyncSpy.mockReturnValueOnce(true)

        await expect(workManInstance.checkForStaging()).rejects.toThrow(`${network}/${codeHash} is already verified.`)
      })

      it('should throw if contract is in staging directory', async () => {
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(true)

        await expect(workManInstance.checkForStaging()).rejects.toThrow(`Workload for ${network}/${codeHash} is staged for processing.`)
      })

      it('should throw if contract is in processing directory', async () => {
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)

        await expect(workManInstance.checkForStaging()).rejects.toThrow(`Workload for ${network}/${codeHash} is in processing.`)
      })

      it('should throw if docker workload limit is exceeded', async () => {
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false)
        mockDockerCanRunMore.mockReturnValueOnce(false)

        await expect(workManInstance.checkForStaging()).rejects.toThrow('Workload limit reached, please retry later')
      })

      it('should not throw any errors if contract is eligible for staging', async () => {
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false)
        mockDockerCanRunMore.mockReturnValueOnce(true)

        await expect(workManInstance.checkForStaging()).resolves.not.toThrow()
      })
    })

    describe('startProcessing', () => {
      it('should throw if processing directory already exists', async () => {
        existsSyncSpy.mockReturnValueOnce(true)
        await expect(workManInstance.startProcessing()).rejects.toThrow(`Workload ${locs.processingDir} already exists`)
      })

      it('should prepare processing directory and run docker', async () => {
        const dockerSpy = jest.spyOn(workManInstance.docker, 'run').mockImplementation()
        existsSyncSpy.mockReturnValueOnce(false)

        await expect(workManInstance.startProcessing()).resolves.not.toThrow()
        expect(mkdirSyncSpy).toBeCalledWith(locs.processingDir, {
          recursive: true
        })
        expect(renameSyncSpy).toBeCalledWith(locs.stagingDir, locs.processingDir)
        expect(dockerSpy).toBeCalled()
      })
    })

    describe('successHandler', () => {
      it('should move generated package to publish/ and clean up processing/', () => {
        renameSyncSpy.mockClear()
        existsSyncSpy.mockImplementation((path: PathLike) => {
          return locs.processingDir === path
        })

        workManInstance.successHandler()

        expect(mkdirSyncSpy).toBeCalledWith(locs.publishDir, {
          recursive: true
        })
        expect(renameSyncSpy).toBeCalledWith(path.resolve(locs.processingDir, 'package'), locs.publishDir)
        expect(rmSyncSpy).toBeCalledWith(locs.processingDir, { recursive: true, force: true })
      })
    })

    describe('errorHandler', () => {
      it('should move logs and cid to error/ and clean up processing/', () => {
        renameSyncSpy.mockClear()
        existsSyncSpy.mockReturnValue(false)
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)

        workManInstance.errorHandler()

        expect(mkdirSyncSpy).toBeCalledWith(locs.errorDir, {
          recursive: true
        })
        expect(renameSyncSpy).toBeCalledWith(path.resolve(locs.processingDir, 'out.log'), path.resolve(locs.errorDir, 'out.log'))
        expect(renameSyncSpy).toBeCalledWith(path.resolve(locs.processingDir, 'cid'), path.resolve(locs.errorDir, 'cid'))
        expect(rmSyncSpy).toBeCalledWith(locs.processingDir, { recursive: true, force: true })
      })
    })
  })

  describe('resolveTypeInfo', () => {
    it('should resolve zip for zip file', async () => {
      const zip = fs.readFileSync(path.resolve(__dirname, '../../__data__/mockZip.zip'))
      const zipHeader = zip.subarray(0, 4)
      await expect(resolveTypeInfo(zipHeader)).resolves.toEqual({
        ext: 'zip',
        mime: 'application/zip'
      })
    })

    it('should resolve Gzip for Gzip file', async () => {
      const gzip = fs.readFileSync(path.resolve(__dirname, '../../__data__/mockGzip.tar.gz'))
      const gzipHeader = gzip.subarray(0, 4)
      await expect(resolveTypeInfo(gzipHeader)).resolves.toEqual({
        ext: 'gz',
        mime: 'application/gzip'
      })
    })

    it('should resolve Bzip2 for Bzip2 file', async () => {
      const bzip2 = fs.readFileSync(path.resolve(__dirname, '../../__data__/mockBzip.tar.bz2'))
      const bzip2Header = bzip2.subarray(0, 4)
      await expect(resolveTypeInfo(bzip2Header)).resolves.toEqual({
        ext: 'bz2',
        mime: 'application/x-bzip2'
      })
    })

    it('should throw error for text file', async () => {
      const txt = fs.readFileSync(path.resolve(__dirname, '../../__data__/mockFile.txt'))
      const txtHeader = txt.subarray(0, 4)
      await expect(resolveTypeInfo(txtHeader)).rejects.toThrow(`Unknown mime type for bytes: ${txtHeader.toString('hex')}`)
    })
  })
})

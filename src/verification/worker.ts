import fs from 'node:fs'
import * as path from 'path'
import { Readable } from 'stream'
import { VerifierLocations } from './locations'

import HttpError from '../errors'
import Docker from './docker'
import { downloadByteCode } from './substrate'
import log from '../log'

const HEAD_BYTES = 4

interface TypeInfo {
  ext: string
  mime: string
}

/**
 * This class manages the work load for contract verifications.
 *
 * Note that it is expected to have a new work manager instance
 * per contract verification, and that directories are in the context
 * of a network and code hash.
 *
 * Including:
 * - Handling directories for the contract work loads
 * - Checking the compressed archive type
 * - Streaming the uploaded package to disk
 * - Downloading the pristine WASM from a Substrate chain
 * - Triggering Docker verification process
 */
class WorkMan {
  locations: VerifierLocations
  docker: Docker

  constructor ({ locations }: { locations: VerifierLocations }) {
    this.locations = locations
    this.docker = new Docker()
  }

  async checkForStaging () {
    const locs = this.locations

    // Contract not verified
    if (locs.isVerified) {
      throw new HttpError(`${locs.codeHashPath} is already verified.`, 400)
    }

    // Work load not in staging
    if (fs.existsSync(locs.stagingDir)) {
      throw new HttpError(`Workload for ${locs.codeHashPath} is staged for processing.`, 400)
    }

    // Work load not in processing
    if (fs.existsSync(locs.processingDir)) {
      throw new HttpError(`Workload for ${locs.codeHashPath} is in processing.`, 400)
    }

    // We can run a new container
    if (!this.docker.canRunMore()) {
      throw new HttpError('Workload limit reached, please retry later', 429)
    }
  }

  async writePristine () {
    await downloadByteCode({
      network: this.locations.network,
      codeHash: this.locations.codeHash,
      dst: path.resolve(this.locations.stagingDir, 'pristine.wasm')
    })
  }

  async writeToStaging (file: Readable) {
    const head : Buffer = file.read(HEAD_BYTES)
    const srcStream = Readable.from(
      await concat(Readable.from(head), file)
    )
    // Determine the mime type from file content
    // https://github.com/mscdex/busboy/issues/236
    const typeInfo = await resolveTypeInfo(head)
    const dst = path.resolve(this.locations.stagingDir, `package.${typeInfo.ext}`)
    const dstStream = fs.createWriteStream(dst)

    // Note that pipe ends by default
    srcStream.pipe(dstStream)
  }

  async startProcessing () {
    const locs = this.locations

    this.prepareDirectory(locs.processingDir)
    log.info(`Moving from ${locs.stagingDir} to ${locs.processingDir}`)
    // Assuming we are using the same device
    fs.renameSync(locs.stagingDir, locs.processingDir)

    // Here max containers could be check again, but it implies to clean up
    // resources in case of max reached.

    this.docker.run({
      processingDir: locs.processingDir,
      successHandler: this.successHandler.bind(this),
      errorHandler: this.errorHandler.bind(this)
    })
  }

  successHandler () {
    const locs = this.locations
    const packDir = path.resolve(locs.processingDir, 'package')
    const targetDir = path.resolve(packDir, 'src', 'target')

    this.prepareDirectory(locs.publishDir)

    if (fs.existsSync(targetDir)) {
      // Move metadata.json to package/ for convenience
      const metadataFile = path.resolve(targetDir, 'release', 'ink', 'metadata.json')
      if (fs.existsSync(metadataFile)) {
        fs.renameSync(metadataFile, path.resolve(packDir, 'metadata.json'))
      }
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    fs.renameSync(packDir, locs.publishDir)

    this.cleanDirectory(locs.processingDir)
    this.cleanDirectory(locs.errorDir)
  }

  errorHandler () {
    const locs = this.locations

    // If error directory already exists, assume it's an outdated error and clean up
    if (fs.existsSync(locs.errorDir)) {
      this.cleanDirectory(locs.errorDir)
    }

    fs.mkdirSync(locs.errorDir, {
      recursive: true
    })

    const plog = path.resolve(locs.processingDir, 'out.log')
    const pcid = path.resolve(locs.processingDir, 'cid')

    if (fs.existsSync(plog)) {
      fs.renameSync(plog, path.resolve(locs.errorDir, 'out.log'))
    }
    if (fs.existsSync(pcid)) {
      fs.renameSync(pcid, path.resolve(locs.errorDir, 'cid'))
    }

    this.cleanDirectory(locs.processingDir)
  }

  cleanStaging () {
    this.cleanDirectory(this.locations.stagingDir)
  }

  prepareStaging () {
    this.prepareDirectory(this.locations.stagingDir)
  }

  private cleanDirectory (dir: string) {
    if (fs.existsSync(dir)) {
      log.info(`Cleaning up directory ${dir}`)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  private prepareDirectory (dir: string) {
    if (fs.existsSync(dir)) {
      throw new HttpError(`Workload ${dir} already exists`, 400)
    }

    fs.mkdirSync(dir, {
      recursive: true
    })

    log.info(`Created directory ${dir}`)
  }
}

async function * concat (...readables : Readable[]) {
  for (const readable of readables) {
    for await (const chunk of readable) { yield chunk }
  }
}

function checkBytes (buffer: Buffer, headers: number[]) {
  for (const [index, header] of headers.entries()) {
    if (header !== buffer[index]) {
      return false
    }
  }

  return true
}

export async function resolveTypeInfo (buffer: Buffer) : Promise<TypeInfo> {
  if (checkBytes(buffer, [0x50, 0x4B, 0x3, 0x4])) {
    return {
      ext: 'zip',
      mime: 'application/zip'
    }
  }

  if (checkBytes(buffer, [0x1F, 0x8B, 0x8])) {
    return {
      ext: 'gz',
      mime: 'application/gzip'
    }
  }

  if (checkBytes(buffer, [0x42, 0x5A, 0x68])) {
    return {
      ext: 'bz2',
      mime: 'application/x-bzip2'
    }
  }

  throw new HttpError(`Unknown mime type for bytes: ${buffer.toString('hex')}`, 400)
}

export default WorkMan

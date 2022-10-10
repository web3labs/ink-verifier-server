import { FastifyBaseLogger } from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'

import HttpError from '../errors'
import Docker from './docker'
import { downloadByteCode } from './substrate'

const BASE_DIR = process.env.BASE_DIR || path.resolve(__dirname, '../../tmp')

const HEAD_BYTES = 4

interface WorkParams {
  network: string,
  codeHash: string,
  log: FastifyBaseLogger
}

interface TypeInfo {
  ext: string
  mime: string
}

/**
 * This class manages the work load for contract verifications.
 *
 * Including:
 * - Working directory for the work loads
 * - Checking the compressed archive type
 * - Writing the uploaded package to disk
 * - Downloading the pristine WASM from a Substrate chain
 * - Checking Docker work load processes
 * - Triggering Docker work load processing
 */
class WorkMan {
  network: string
  codeHash: string
  stagingDir: string
  processingDir: string
  docker: Docker
  log: FastifyBaseLogger

  constructor (params: WorkParams) {
    this.network = String(params.network)
    this.codeHash = String(params.codeHash)
    this.log = params.log
    this.stagingDir = path.resolve(BASE_DIR, 'staging', this.network, this.codeHash)
    this.processingDir = path.resolve(BASE_DIR, 'processing', this.network, this.codeHash)
    this.docker = new Docker()
  }

  async checkForStaging () {
    // Work load not verified
    // TBD

    // Work load not in staging
    if (fs.existsSync(this.stagingDir)) {
      throw new HttpError(`Workload for ${this.network}/${this.codeHash} is staged for processing.`, 400)
    }

    // Work load not in processing
    if (fs.existsSync(this.processingDir)) {
      throw new HttpError(`Workload for ${this.network}/${this.codeHash} is in processing.`, 400)
    }

    // We can run a new container
    if (!this.docker.canRunMore()) {
      throw new HttpError('Workload limit reached, please retry later', 429)
    }
  }

  async writePristine () {
    await downloadByteCode({
      network: this.network,
      codeHash: this.codeHash,
      dst: path.resolve(this.stagingDir, 'pristine.wasm')
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
    const dst = path.resolve(this.stagingDir, `package.${typeInfo.ext}`)
    const dstStream = fs.createWriteStream(dst)

    // Note that pipe ends by default
    srcStream.pipe(dstStream)
  }

  async startProcessing () {
    this.prepareDirectory(this.processingDir)
    this.log.info(`Moving from ${this.stagingDir} to ${this.processingDir}`)
    // Assuming we are using the same device
    fs.renameSync(this.stagingDir, this.processingDir)
  }

  cleanStaging () {
    this.log.info(`Cleaning up staging directory ${this.stagingDir}`)
    fs.rmdirSync(this.stagingDir)
  }

  prepareStaging () {
    this.prepareDirectory(this.stagingDir)
  }

  private prepareDirectory (dir: string) {
    if (fs.existsSync(dir)) {
      throw new HttpError(`Workload ${dir} already exists`, 400)
    }
    fs.mkdirSync(dir, { recursive: true })
    this.log.info(`Created directory ${dir}`)
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

async function resolveTypeInfo (buffer: Buffer) : Promise<TypeInfo> {
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

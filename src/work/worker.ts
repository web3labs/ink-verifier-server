import { FastifyBaseLogger } from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'

import HttpError from '../errors'
import Docker from './docker'
import { downloadByteCode } from './substrate'

const BASE_DIR = process.env.WORK_BASE_DIR || path.resolve(__dirname, '../../tmp')

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
  workDir: string
  docker: Docker
  log: FastifyBaseLogger

  constructor (params: WorkParams) {
    this.network = String(params.network)
    this.codeHash = String(params.codeHash)
    this.log = params.log
    this.workDir = path.resolve(BASE_DIR, this.network, this.codeHash)
    this.docker = new Docker()
  }

  async check () {
    const psList = await this.docker.ps()
    console.log(psList)

    if (fs.existsSync(this.workDir)) {
      throw new HttpError(`Workload for ${this.network}/${this.codeHash} is queued for processing.`, 400)
    }
  }

  async writePristine () {
    const sink = fs.createWriteStream(path.resolve(this.workDir, 'pristine.wasm'))
    await downloadByteCode({
      network: this.network,
      codeHash: this.codeHash,
      sink
    })
  }

  async pump (file: Readable) {
    const head : Buffer = file.read(HEAD_BYTES)
    const fileStream = Readable.from(
      await concat(Readable.from(head), file)
    )
    // Determine the mime type from file content
    // https://github.com/mscdex/busboy/issues/236
    const typeInfo = await resolveTypeInfo(head)
    const dst = this.prepareWorkDir(typeInfo)

    fileStream.pipe(fs.createWriteStream(dst))
  }

  clean () {
    this.log.info(`Cleaning up directory ${this.workDir}`)
    fs.rmdirSync(this.workDir)
  }

  private prepareWorkDir (typeInfo: TypeInfo) {
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true })
      this.log.info(`Created work directory ${this.workDir}`)
    }
    return path.resolve(this.workDir, `package.${typeInfo.ext}`)
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

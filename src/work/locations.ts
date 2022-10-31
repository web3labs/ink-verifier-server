import path from 'node:path'

import { BASE_DIR, PUBLISH_DIR } from '../config'
import { NetworkCodeParams } from '../routes/common'

export class VerifierLocations {
  stagingDir: string
  processingDir: string
  errorDir: string
  publishDir: string
  network: string
  codeHash: string

  constructor ({ network, codeHash }: NetworkCodeParams) {
    this.network = network
    this.codeHash = codeHash
    this.stagingDir = path.resolve(BASE_DIR, 'staging', network, codeHash)
    this.processingDir = path.resolve(BASE_DIR, 'processing', network, codeHash)
    this.errorDir = path.resolve(BASE_DIR, 'error', network, codeHash)
    // Code hash is content addressable, so it works for any
    this.publishDir = path.resolve(PUBLISH_DIR, codeHash)
  }

  get codeHashPath () {
    return `${this.network}/${this.codeHash}`
  }
}

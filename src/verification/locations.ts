import fs from 'node:fs'
import path from 'node:path'

import { BASE_DIR, PUBLISH_DIR } from '../config'
import { NetworkCodeParams } from '../routes/common'

export enum VerificationStatus {
  'unverified' = 'unverified',
  'metadata' = 'metadata', // The code hash has metadata but not sources
  'verified' = 'verified', // The code hash is verified by reproducible build
  'processing' = 'processing',
  'staging' = 'staging',
  'error' = 'error',
}

export interface VerificationInfo {
  status: VerificationStatus,
  timestamp: string
}

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

  get verificationInfo (): VerificationInfo {
    if (this.isVerified) {
      return {
        status: VerificationStatus.verified,
        timestamp: fs.statSync(path.resolve(this.publishDir, 'src')).mtime.toISOString()
      }
    } else if (this.hasMetadata) {
      return {
        status: VerificationStatus.metadata,
        timestamp: fs.statSync(path.resolve(this.publishDir, 'metadata.json')).mtime.toISOString()
      }
    } else if (fs.existsSync(this.processingDir)) {
      return {
        status: VerificationStatus.processing,
        timestamp: fs.statSync(this.processingDir).mtime.toISOString()
      }
    } else if (fs.existsSync(this.stagingDir)) {
      return {
        status: VerificationStatus.staging,
        timestamp: fs.statSync(this.stagingDir).mtime.toISOString()
      }
    } else if (fs.existsSync(this.errorDir)) {
      return {
        status: VerificationStatus.error,
        timestamp: fs.statSync(this.errorDir).mtime.toISOString()
      }
    } else {
      return {
        status: VerificationStatus.unverified,
        timestamp: ''
      }
    }
  }

  get isVerified (): boolean {
    return fs.existsSync(path.resolve(this.publishDir, 'src'))
  }

  get hasMetadata (): boolean {
    return fs.existsSync(path.resolve(this.publishDir, 'metadata.json'))
  }

  get codeHashPath () {
    return `${this.network}/${this.codeHash}`
  }
}

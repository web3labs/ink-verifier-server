
import { mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

import { signatureVerify } from '@polkadot/util-crypto'
import type { HexString } from '@polkadot/util/types'

import { MultipartFile } from '@fastify/multipart'

import { VerifierLocations } from './locations'
import { ownerInfoOf } from './substrate'
import log from '../log'
import { TMP_DIR } from '../config'

/**
 * Verifies the owner signature for a code hash
 * and `metadata.json` hash.
 *
 * The process is as follows:
 * 1. Retrieves the owner address for a code hash
 * 2. Verifies tha provided signature for [sha256(metadata.json)|code hash] is valid
 * 3. If valid moves the metadata.json file to the publish directory
 *
 * Note that this is meant as an alternative way to make the metadata information
 * available for messages and events decoding.
 *
 * Rationale: The owner of the code hash is trusted since there is no incentive
 * to provide the wrong ABI for its own deployed bytecode. The owner can deploy
 * any bytecode in the first place.
 */
export async function verifyMetadata ({
  data,
  signature,
  locs
}: {
    data: MultipartFile,
    signature: HexString | Uint8Array | string,
    locs: VerifierLocations
}) {
  let tmpDir = path.join(TMP_DIR, `meta-${locs.network}-${locs.codeHash}`)
  const { file } = data

  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, {
        recursive: true
      })
    }

    // NOTE: this can lead to race conditions
    tmpDir = await mkdtemp(tmpDir)
    const tmpMetaFile = path.join(tmpDir, 'metadata.json')
    const tmpStream = fs.createWriteStream(tmpMetaFile)

    const verifiedWrite = new Promise<void>((resolve, reject) => {
      const sum = crypto.createHash('sha256')

      file.on('error', reject)
      file.on('data', function (chunk) {
        try {
          tmpStream.write(chunk)
          sum.update(chunk)
        } catch (error) {
          return reject(error)
        }
      })
      file.on('end', async function () {
        try {
          tmpStream.end()
          const message = sum.digest('hex') + locs.codeHash.replace(/^0x/, '')
          const owner = await ownerInfoOf({
            network: locs.network,
            codeHash: locs.codeHash
          })

          log.info(`Verifying [codeHash=${locs.codeHash}, sig=${signature}, owner=${owner}, message=${message}]`)
          const sv = signatureVerify(message, signature, owner)

          if (sv.isValid) {
            log.info(`Successful verification [codeHash = ${locs.codeHash}]`)

            if (!fs.existsSync(locs.publishDir)) {
              fs.mkdirSync(locs.publishDir, {
                recursive: true
              })
            }

            fs.renameSync(tmpMetaFile, path.resolve(locs.publishDir, 'metadata.json'))
            return resolve()
          } else {
            return reject(new Error(`Invalid signature ${signature} for [message=${message}, owner=${owner}]`))
          }
        } catch (error) {
          return reject(error)
        }
      })
    })

    await verifiedWrite
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}

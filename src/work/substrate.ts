import fs from 'node:fs'

import { ApiPromise, WsProvider } from '@polkadot/api'
import { createWsEndpoints } from '@polkadot/apps-config/endpoints'

import HttpError from '../errors'

function hasContractsPallet (api: ApiPromise) : boolean {
  return Object.entries(api.query)
    .find(([section]) => section === 'contracts') !==
    undefined
}

function writeResponse (dst: string, data: Uint8Array) {
  const sink = fs.createWriteStream(dst)
  return new Promise((resolve, reject) => {
    sink.on('error', reject)
    sink.on('open', () => {
      sink.write(data)
      sink.end()
    })
    sink.on('close', resolve)
  })
}

async function fetchPristineCode ({
  wsEndpoint, codeHash
}: {
  wsEndpoint: string, codeHash: string
}) : Promise<Uint8Array> {
  const provider = new WsProvider(wsEndpoint)
  const api = await ApiPromise.create({ provider })

  try {
    if (hasContractsPallet(api)) {
      const res = await api.query.contracts.pristineCode(codeHash)
      if (res.isEmpty) {
        throw new Error(`Pristine code not found for ${codeHash}`)
      }
      return res.toU8a(true)
    } else {
      throw new Error(`Contracts pallet not available in ${wsEndpoint}`)
    }
  } catch (error) {
    throw HttpError.from(error, 400)
  } finally {
    await api.disconnect()
  }
}

/**
 * Writes the pristine WASM to the specified sink
 * for a given code hash, while resolves the network
 * endpoint by info name.
 */
export async function downloadByteCode ({
  network, codeHash, dst
}: {
  network: string, codeHash: string, dst: string
}) {
  const endpoints = createWsEndpoints().filter(({
    isDisabled, isUnreachable, value, info
  }) =>
    !isDisabled &&
    !isUnreachable &&
    value &&
    !value.includes('127.0.0.1') &&
    !value.startsWith('light://') &&
    info === network
  )

  if (endpoints.length > 0) {
    const endpoint = endpoints[0]
    const data = await fetchPristineCode({
      wsEndpoint: endpoint.value,
      codeHash
    })
    await writeResponse(dst, data)
  } else {
    throw new HttpError(`No endpoint found for ${network}`, 400)
  }
}

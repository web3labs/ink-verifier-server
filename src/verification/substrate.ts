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

async function contractsQuery<T> (
  wsEndpoint: string,
  call: (api: ApiPromise) => Promise<T>
) : Promise<T> {
  const provider = new WsProvider(wsEndpoint)
  const api = await ApiPromise.create({ provider })

  try {
    if (hasContractsPallet(api)) {
      return await call(api)
    } else {
      throw new Error(`Contracts pallet not available in ${wsEndpoint}`)
    }
  } catch (error) {
    throw HttpError.from(error, 400)
  } finally {
    await api.disconnect()
  }
}

async function fetchPristineCode ({
  wsEndpoint, codeHash
}: {
  wsEndpoint: string,
  codeHash: string
}) : Promise<Uint8Array> {
  return contractsQuery(wsEndpoint, async (api) => {
    const res = await api.query.contracts.pristineCode(codeHash)
    if (res.isEmpty) {
      throw new Error(`Pristine code not found for ${codeHash}`)
    }
    return res.toU8a(true)
  })
}

function resolveEndpoint (network: string) : string {
  const endpoints = createWsEndpoints().filter(({
    isDisabled, isUnreachable, value, info
  }) =>
    !isDisabled &&
    !isUnreachable &&
    value &&
    !value.startsWith('light://') &&
    // TODO abhi: this is a tmp fix to filter out aleph zero mainnet endpoint.
    // we should be impl a proper fix to select mainnet, testnet endpoints.
    value !== 'wss://ws.azero.dev' &&
    info === network
  )

  if (endpoints.length > 0) {
    const endpoint = endpoints[0]
    return endpoint.value
  } else {
    throw new HttpError(`No endpoint found for ${network}`, 400)
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
  const wsEndpoint = resolveEndpoint(network)
  const data = await fetchPristineCode({
    wsEndpoint,
    codeHash
  })
  await writeResponse(dst, data)
}

type OwnerInfo = {
  owner: string
}

/**
 * Retrieves the owner address for a given code hash.
 *
 * @returns the owner address
 */
export async function ownerInfoOf ({
  network, codeHash
}: { network: string, codeHash: string }) : Promise<string> {
  const wsEndpoint = resolveEndpoint(network)
  return contractsQuery(wsEndpoint, async (api) => {
    const res = await api.query.contracts.ownerInfoOf(codeHash)
    if (res.isEmpty) {
      throw new Error(`Owner info not found for ${codeHash}`)
    }

    const jsonRes = res.toJSON()
    if (jsonRes) {
      const { owner } = jsonRes as OwnerInfo
      return owner
    } else {
      throw new Error(`Owner info not found for ${codeHash}`)
    }
  })
}

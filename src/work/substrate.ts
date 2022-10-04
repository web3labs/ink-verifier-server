import { ApiPromise, WsProvider } from '@polkadot/api'
import { createWsEndpoints } from '@polkadot/apps-config/endpoints'
import { Writable } from 'stream'
import HttpError from '../errors'

function hasContractsPallet (api: ApiPromise) : boolean {
  return Object.entries(api.query)
    .find(([section, _]) => section === 'contracts') !==
    undefined
}

async function pristineCode ({
  wsEndpoint, codeHash, sink
}: {
  wsEndpoint: string, codeHash: string, sink: Writable
}) {
  const provider = new WsProvider(wsEndpoint)
  const api = await ApiPromise.create({ provider })

  try {
    if (hasContractsPallet(api)) {
      const codec = await api.query.contracts.pristineCode(codeHash)
      if (codec.isEmpty) {
        throw new Error(`Pristine code not found for ${codeHash}`)
      }
      // TODO check the 5 byte prefix?
      sink.write(codec.toU8a().slice(5))
    } else {
      throw new Error(`Contracts pallet not available in ${wsEndpoint}`)
    }
  } catch (error) {
    throw HttpError.from(error, 400)
  } finally {
    api.disconnect()
  }
}

/**
 * Writes the pristine WASM to the specified sink
 * for a given code hash, while resolves the network
 * endpoint by info name.
 */
export function downloadByteCode ({
  network, codeHash, sink
}: {
  network: string, codeHash: string, sink: Writable
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

    pristineCode({
      wsEndpoint: endpoint.value,
      codeHash,
      sink
    })
  } else {
    throw new HttpError(`No endpoint found for ${network}`, 400)
  }
}

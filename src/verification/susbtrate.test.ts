import EventEmitter from 'node:events'
import fs from 'node:fs'
import HttpError from '../errors'
import { downloadByteCode } from './substrate'
import { createWsEndpoints } from '@polkadot/apps-config/endpoints'

class MockStream extends EventEmitter {
  write = jest.fn()
  end = jest.fn()
}
const mstream = new MockStream()
const knownCodeHash = '0xf93cba52bf92b0caaa3880726dd917e09190cedb899726b738ba768c0bc43a17'
const blob = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d,
  0x01, 0x00, 0x00, 0x00
])

jest.mock('node:fs', () => (
  {
    createWriteStream: jest.fn(() => (mstream))
  }
))

jest.mock('@polkadot/api', () => {
  class WsProvider {}
  return {
    WsProvider,
    ApiPromise: {
      create: jest.fn(() => ({
        disconnect: jest.fn(),
        query: {
          contracts: {
            pristineCode: jest.fn((codeHash: string) => ({
              isEmpty: (knownCodeHash !== codeHash),
              toU8a () {
                // We return the blob always but signal emptiness above
                // if the code hash is not known
                return blob
              }
            }
            ))
          }
        }
      }))
    }
  }
})

describe('substrate', () => {
  describe('download bytecode', () => {
    it('should fail if the network name cannot be resolved', async () => {
      await expect(downloadByteCode({
        network: 'network-does-not-exist',
        codeHash: '0x',
        dst: ''
      })).rejects.toThrow(HttpError)
    })

    it('should retrieve wasm for shibuya network with known code hash', async () => {
      const promise = downloadByteCode({
        network: 'shibuya',
        codeHash: knownCodeHash,
        dst: ''
      })
      await new Promise(process.nextTick)

      expect(fs.createWriteStream).toBeCalled()

      mstream.emit('open')
      mstream.emit('close')

      await promise

      expect(mstream.write).toBeCalledWith<[Uint8Array]>(blob)
    })

    it('should throw error for shibuya network with unknown code hash', async () => {
      await expect(downloadByteCode({
        network: 'shibuya',
        codeHash: '0xbadbadbad',
        dst: ''
      })).rejects.toThrow(HttpError)
    })
  })

  describe('get azero testnet endpoint', () => {
    it('should get aleph zero testnet endpoint', async () => {
      const endpoint = createWsEndpoints().filter(({
        isDisabled, isUnreachable, value, info, text
      }) =>
        !isDisabled &&
        !isUnreachable &&
        value &&
        !value.startsWith('light://') &&
        info === 'aleph-testnet'
      )[0]
      expect(endpoint.value).toEqual('wss://ws.test.azero.dev')
    })
  })

  describe('get azero prod endpoint', () => {
    it('should get aleph zero prod endpoint', async () => {
      const endpoint = createWsEndpoints().filter(({
        isDisabled, isUnreachable, value, info, text
      }) =>
        !isDisabled &&
        !isUnreachable &&
        value &&
        !value.startsWith('light://') &&
        info === 'aleph'
      )[0]
      expect(endpoint.value).toEqual('wss://ws.azero.dev')
    })
  })
})

import fs from 'node:fs'
import 'node:fs/promises'
import { EventEmitter } from 'node:stream'

import { BusboyFileStream } from '@fastify/busboy'

import { MultipartFields, MultipartFile } from '@fastify/multipart'

import { VerifierLocations } from './locations'
import { verifyMetadata } from './metadata'

jest.mock('node:fs', () => (
  {
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    renameSync: jest.fn(),
    mkdirSync: jest.fn(),
    rmSync: jest.fn(),
    createWriteStream: jest.fn().mockImplementation(
      () => ({
        write: jest.fn(),
        end: jest.fn()
      })
    )
  }
))

jest.mock('node:fs/promises', () => (
  {
    mkdtemp: () => Promise.resolve('/tmp')
  }
))

jest.mock('./substrate', () => (
  {
    ownerInfoOf: () => Promise.resolve(
      '5EbadWiE5vnS99RGJJtDbBTxMeJJGbQcXjoWtduS9Ub7bNPn'
    )
  }
))

const fileEmitter = new EventEmitter()

class MockMultipart implements MultipartFile {
  toBuffer: () => Promise<Buffer>
  file: BusboyFileStream
  fieldname: string
  filename: string
  encoding: string
  mimetype: string
  fields: MultipartFields

  constructor () {
    this.fieldname = 'file'
    this.filename = 'file'
    this.encoding = ''
    this.mimetype = ''
    this.fields = {}
    this.toBuffer = jest.fn()
    this.file = fileEmitter as BusboyFileStream
  }
}

describe('metadata', () => {
  const existsSyncSpy = jest.spyOn(fs, 'existsSync')

  it('should validate owner-signed content', async () => {
    existsSyncSpy.mockReturnValue(true)

    setTimeout(() => {
      // sha256 fc95da74a81e8983a18b5ea2fda5fb5fa10d76a2570421c4d3f5a14003528651
      fileEmitter.emit('data', Buffer.from(
        'In other words, the Android Meme is technology that has the qualities of "being alive".'
      ))
      fileEmitter.emit('end')
      expect(true)
    }, 100)

    await expect(
      verifyMetadata({
        data: new MockMultipart(),
        // fc95da74a81e8983a18b5ea2fda5fb5fa10d76a2570421c4d3f5a14003528651 | ad8e1a3d7d1c44b4c7b3f715765ab8003e15aa2d8d1146a64cbc9b8f7e0a8df9
        signature: '0xdc905d908f328150fc700681e834ce347d5afb3149571163256d47d731e1c370060790aa1b8fe5791a71cbf2a623b10313fec3154087944a1830bfd2fff2b080',
        locs: new VerifierLocations({
          network: 'rococoContracts',
          codeHash: '0xad8e1a3d7d1c44b4c7b3f715765ab8003e15aa2d8d1146a64cbc9b8f7e0a8df9'
        })
      })
    ).resolves.toBeUndefined()
  })

  it('should fail on invalid signature', async () => {
    existsSyncSpy.mockReturnValue(true)

    setTimeout(() => {
      // sha256 fc95da74a81e8983a18b5ea2fda5fb5fa10d76a2570421c4d3f5a14003528651
      fileEmitter.emit('data', Buffer.from(
        'In other words, the Android Meme is technology that has the qualities of "being alive".'
      ))
      fileEmitter.emit('end')
      expect(true)
    }, 100)

    await expect(verifyMetadata({
      data: new MockMultipart(),
      // fc95da74a81e8983a18b5ea2fda5fb5fa10d76a2570421c4d3f5a14003528651|ad8e1a3d7d1c44b4c7b3f715765ab8003e15aa2d8d1146a64cbc9b8f7e0a8df9
      signature: '0xbad12314e7781a1ec48720134bd2b19a12d4e5531f584a7ac66980f98dcde82757b258b7a11fe71986fd2682198db6789f1380f63d7fdb10f4206277c355178d',
      locs: new VerifierLocations({
        network: 'rococoContracts',
        codeHash: '0xad8e1a3d7d1c44b4c7b3f715765ab8003e15aa2d8d1146a64cbc9b8f7e0a8df9'
      })
    })
    ).rejects.toBeDefined()
  })
})

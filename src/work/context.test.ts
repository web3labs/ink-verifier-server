import { spawn } from 'node:child_process'
import EventEmitter from 'node:events'
import workContext from './context'

class MockChildProcess extends EventEmitter {
  pid: number

  constructor (pid: number) {
    super()
    this.pid = pid
  }

  kill () {
    return true
  }
}

jest.mock('node:child_process', () => {
  const originalModule = jest.requireActual('node:child_process')

  return {
    __esModule: true,
    ...originalModule,
    spawn: jest.fn((pid: string) => {
      return new MockChildProcess(+pid)
    })
  }
})

describe('work context', () => {
  let mockExit: jest.SpyInstance<any, any>
  let mockStdout: jest.SpyInstance<any, any>

  beforeAll(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation()
    mockStdout = jest.spyOn(process.stdout, 'write')
  })

  afterAll(() => {
    mockExit.mockRestore()
    mockStdout.mockRestore()
  })

  it('should have empty process list on instantiate', () => {
    expect(workContext.processes).toEqual([])
  })

  it('should kill all child processes before exiting', () => {
    const cp = spawn('123')
    const mockKill = jest.spyOn(cp, 'kill')

    workContext.addProc(cp)
    workContext.onExit('kill', 0)

    expect(mockKill).toBeCalledTimes(1)
    expect(mockExit).toBeCalledWith(0)
    expect(mockStdout).toBeCalledWith('1 sub-process/es running\n')
    expect(mockStdout).toBeCalledWith('OK\n')

    mockKill.mockRestore()
  })

  it('should kill child processes with signal 9 if kill fails before exiting', () => {
    const cp = spawn('123')
    const mockKill = jest.spyOn(cp, 'kill').mockImplementation(() => { return false })

    workContext.addProc(cp)
    workContext.onExit('kill', 0)

    expect(mockKill).toBeCalledTimes(2)
    expect(mockKill).toBeCalledWith(9)
    expect(mockExit).toBeCalledWith(0)
    expect(mockStdout).toBeCalledWith('1 sub-process/es running\n')
    expect(mockStdout).toBeCalledWith('FAIL\n')

    mockKill.mockRestore()
  })
})

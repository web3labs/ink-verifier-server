import { ChildProcess } from 'node:child_process'

export class WorkContext {
  processes: Array<ChildProcess>

  constructor () {
    this.processes = []
  }

  addProc (p: ChildProcess) {
    this.processes.push(p)
  }

  rmProc (p: ChildProcess) {
    const i = this.processes.indexOf(p)
    if (i > -1) {
      this.processes.splice(i, 1)
    }
  }

  get runningProcs () {
    return this.processes.length
  }

  onExit (event: string, exitCode: number) {
    if (this.runningProcs > 0) {
      process.stdout.write(`${this.runningProcs} sub-process/es running\n`)

      this.processes.forEach(p => {
        process.stdout.write(`> SIGTERM (${p.pid}): `)
        if (p.kill()) {
          process.stdout.write('OK\n')
        } else {
          process.stdout.write('FAIL\n')
          process.stdout.write(`> SIGKILL ${p.pid}: `)
          if (p.kill(9)) {
            process.stdout.write('OK\n')
          } else {
            process.stdout.write('FAIL\n')
          }
        }
      })
    }
    process.exit(exitCode)
  }
}

const workContext = new WorkContext()

// Singleton leveraging caching
export default workContext

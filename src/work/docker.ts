import util from 'util'
import { exec, spawn } from 'node:child_process'
import { cliTable2Json } from 'cli-table-2-json'

const MAX_CONTAINERS = process.env.MAX_CONTAINERS || 5

const pexec = util.promisify(exec)

function splitLines (input: string): string[] {
  return input.replace(/\r/g, '').split('\n')
}

class Docker {
  // Long running process
  run () {
    // TODO run with --cid
    // Check if in processing
    // Move from staging/ to processing/
    // empty errors/ on re-processing? or just rely on order...
    const p = spawn('sleep', ['360'], { detached: true })
    console.log('Running p ', p.pid)

    p.on('close', (code) => {
      // Move from processing to if OK verfieds/ in NOK errors/
      console.log(`child process exited with code ${code}`)
    })
  }

  async ps () {
    const { stdout } = await pexec('docker ps')
    const lines = splitLines(stdout)
    return cliTable2Json(lines)
  }

  async canRunMore () {
    const list = await this.ps()
    return list.length <= MAX_CONTAINERS
  }
}

export default Docker

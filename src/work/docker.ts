import util from 'util'
import { exec } from 'node:child_process'
import { cliTable2Json } from 'cli-table-2-json'

const pexec = util.promisify(exec)
function splitLines (input: string): string[] {
  return input.replace(/\r/g, '').split('\n')
}

class Docker {
  run () {
    // TODO run with --cid
  }

  async ps () {
    const { stdout } = await pexec('docker ps')
    const lines = splitLines(stdout)
    return cliTable2Json(lines)
  }
}

export default Docker

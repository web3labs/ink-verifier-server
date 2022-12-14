import os from 'node:os'
import path from 'node:path'

import dotenv from 'dotenv'

dotenv.config()

export const BASE_DIR = process.env.BASE_DIR || path.resolve(__dirname, '../../.tmp')
export const PUBLISH_DIR = process.env.PUBLISH_DIR || path.resolve(__dirname, '../../.tmp/publish')
export const MAX_CONTAINERS = Number(process.env.MAX_CONTAINERS || 5)
export const VERIFIER_IMAGE = process.env.VERIFIER_IMAGE || 'ink-verifier:develop'
export const CACHES_DIR = process.env.CACHES_DIR || path.resolve(__dirname, '../../.tmp/caches')
export const TMP_DIR = process.env.TMP_DIR || os.tmpdir()
export const SERVER_HOST = process.env.SERVER_HOST || '127.0.0.1'
export const SERVER_PORT = Number(process.env.SERVER_PORT || 3001)
export const OAS_URL = process.env.OAS_URL || `http://${SERVER_HOST}:${SERVER_PORT}`
export const CONTAINER_ENGINE = process.env.CONTAINER_ENGINE || 'docker'
// e.g. '--user uid:gid'
export const CONTAINER_RUN_PARAMS = process.env.CONTAINER_RUN_PARAMS

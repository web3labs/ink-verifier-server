import path from 'path'

import dotenv from 'dotenv'

dotenv.config()

export const BASE_DIR = process.env.BASE_DIR || path.resolve(__dirname, '../../tmp')
export const MAX_CONTAINERS = Number(process.env.MAX_CONTAINERS || 5)
export const VERIFIER_IMAGE = process.env.VERIFIER_IMAGE || 'ink-verifier:develop'
export const CACHES_DIR = process.env.CACHES_DIR || path.resolve(__dirname, '../../tmp/caches')
export const SERVER_HOST = process.env.SERVER_HOST || '127.0.0.1'
export const SERVER_PORT = Number(process.env.SERVER_PORT || 3000)

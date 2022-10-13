import path from 'path'

import dotenv from 'dotenv'

dotenv.config()

export const BASE_DIR = process.env.BASE_DIR || path.resolve(__dirname, '../../tmp')
export const PUBLISH_DIR = process.env.BASE_DIR || path.resolve(__dirname, '../../publish')
export const MAX_CONTAINERS = Number(process.env.MAX_CONTAINERS || 5)
export const VERIFIER_IMAGE = process.env.VERIFIER_IMAGE || 'ink-verifier:develop'
export const CACHES_DIR = process.env.CACHES_DIR || path.resolve(__dirname, '../../tmp/caches')
export const SERVER_HOST = process.env.SERVER_HOST || '127.0.0.1'
export const SERVER_PORT = Number(process.env.SERVER_PORT || 3000)
export const OAS_URL = process.env.OAS_URL || `http://${SERVER_HOST}:${SERVER_PORT}`

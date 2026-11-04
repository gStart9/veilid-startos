import { Socket } from 'node:net'

export const dataDir = '/var/db/veilid-server'
export const p2pPort = 5150

/**
 * The unauthenticated JSON API. Bound without an exported interface, so it is
 * reachable only over the LXC bridge — a dependent resolves it with
 * `sdk.host.getBridgeAddress(effects, { packageId: 'veilid', hostId: apiHostId,
 * internalPort: apiPort })`. These two names are a contract for dependents.
 */
export const apiHostId = 'api'
export const apiPort = 5959

export const attachedStates = [
  'AttachedWeak',
  'AttachedFair',
  'AttachedGood',
  'AttachedStrong',
  'AttachedFull',
] as const

export type VeilidState = {
  attachment: {
    state: string
    public_internet_ready: boolean
    live_peer_count: number
  }
  network: { node_ids: string[] }
}

/**
 * Sends one request to the node's JSON API on loopback and resolves with the
 * `GetState` reply. Reachable only from the main context, where subcontainers'
 * network namespace is shared.
 */
export const getState = () =>
  new Promise<VeilidState>((resolve, reject) => {
    const socket = new Socket()
    let buffer = ''
    socket.setTimeout(5000, () => socket.destroy(new Error('timeout')))
    socket.on('error', reject)
    socket.on('close', () => reject(new Error('connection closed')))
    socket.on('data', (chunk) => {
      buffer += chunk.toString()
      let newline
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        const msg = JSON.parse(line)
        if (msg.type !== 'Response' || msg.id !== 1) continue
        socket.destroy()
        if (msg.error) return reject(new Error(JSON.stringify(msg.error)))
        return resolve(msg.value)
      }
    })
    socket.connect(apiPort, '127.0.0.1', () =>
      socket.write(JSON.stringify({ id: 1, op: 'GetState' }) + '\n'),
    )
  })
